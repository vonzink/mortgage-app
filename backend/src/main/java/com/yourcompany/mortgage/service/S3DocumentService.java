package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.DocumentDTO;
import com.yourcompany.mortgage.model.Document;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.DocumentRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.awscore.exception.AwsServiceException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Documents live in S3. The Postgres `documents` row is metadata only.
 *
 * Key convention (mirrors what Phase D access control will gate against):
 *   applications/{applicationId}/{partyRole}/{documentType}/{docUuid}-{safeFilename}
 *
 * Lifecycle is driven by S3 object tags (loan_state, sensitivity, retention_class, source),
 * not by key — keys are immutable. CDK in Phase C owns the lifecycle rules.
 */
@Service
public class S3DocumentService {

    private static final Logger log = LoggerFactory.getLogger(S3DocumentService.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final DocumentRepository documentRepository;
    private final LoanApplicationRepository loanApplicationRepository;

    @Value("${aws.s3.documents-bucket}")
    private String bucket;

    @Value("${aws.s3.presigned-ttl-seconds:900}")
    private long presignedTtlSeconds;

    public S3DocumentService(S3Client s3Client,
                             S3Presigner s3Presigner,
                             DocumentRepository documentRepository,
                             LoanApplicationRepository loanApplicationRepository) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.documentRepository = documentRepository;
        this.loanApplicationRepository = loanApplicationRepository;
    }

    public record PresignedUploadResponse(String docUuid, String uploadUrl, String s3Key,
                                          long expiresInSeconds) {}

    public record PresignedDownloadResponse(String docUuid, String downloadUrl,
                                            String fileName, long expiresInSeconds) {}

    /**
     * Step 1 of upload: create a `pending` Document row and return a presigned PUT URL.
     * The browser PUTs directly to S3 against this URL, then calls confirm().
     */
    @Transactional
    public PresignedUploadResponse createPresignedUpload(Long applicationId,
                                                         String documentType,
                                                         String partyRole,
                                                         String fileName,
                                                         String contentType) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));

        String safePartyRole = sanitizeSegment(partyRole != null ? partyRole : "borrower");
        String safeDocumentType = sanitizeSegment(documentType != null ? documentType : "Other");
        String safeFilename = sanitizeFilename(fileName);
        String docUuid = UUID.randomUUID().toString();

        String s3Key = String.format("applications/%d/%s/%s/%s-%s",
                applicationId, safePartyRole, safeDocumentType, docUuid, safeFilename);

        Document doc = new Document();
        doc.setApplication(application);
        doc.setDocUuid(docUuid);
        doc.setS3Key(s3Key);
        doc.setDocumentType(documentType);
        doc.setFileName(fileName);
        doc.setSafeFilename(safeFilename);
        doc.setContentType(contentType);
        doc.setPartyRole(safePartyRole);
        doc.setAddedByRole(safePartyRole);
        doc.setUploadStatus(Document.STATUS_PENDING);
        doc.setUploadedAt(LocalDateTime.now());
        documentRepository.save(doc);

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(s3Key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignedTtlSeconds))
                .putObjectRequest(putRequest)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
        return new PresignedUploadResponse(docUuid, presigned.url().toString(), s3Key, presignedTtlSeconds);
    }

    /**
     * Step 3 of upload: HEAD the object to verify the browser upload landed,
     * apply lifecycle tags, flip status to 'uploaded'.
     */
    @Transactional
    public DocumentDTO confirmUpload(String docUuid) {
        Document doc = documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + docUuid));

        if (Document.STATUS_UPLOADED.equals(doc.getUploadStatus())) {
            return toDTO(doc);
        }

        HeadObjectResponse head;
        try {
            head = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(doc.getS3Key())
                    .build());
        } catch (NoSuchKeyException e) {
            doc.setUploadStatus(Document.STATUS_FAILED);
            documentRepository.save(doc);
            throw new IllegalStateException("Object not present in S3 — upload likely failed: " + doc.getS3Key());
        } catch (AwsServiceException e) {
            log.warn("S3 HEAD failed for {}: {}", doc.getS3Key(), e.awsErrorDetails().errorMessage());
            throw e;
        }

        doc.setFileSize(head.contentLength());
        if (doc.getContentType() == null) {
            doc.setContentType(head.contentType());
        }

        applyLifecycleTags(doc);

        doc.setUploadStatus(Document.STATUS_UPLOADED);
        documentRepository.save(doc);
        return toDTO(doc);
    }

    /**
     * Issue a short-lived GET URL for the browser to download the file directly from S3.
     */
    public PresignedDownloadResponse createPresignedDownload(String docUuid) {
        Document doc = documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + docUuid));

        if (!Document.STATUS_UPLOADED.equals(doc.getUploadStatus())) {
            throw new IllegalStateException("Document is not in uploaded state: " + doc.getUploadStatus());
        }

        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(doc.getS3Key())
                .responseContentDisposition("attachment; filename=\"" + doc.getFileName() + "\"")
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignedTtlSeconds))
                .getObjectRequest(getRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        return new PresignedDownloadResponse(docUuid, presigned.url().toString(),
                doc.getFileName(), presignedTtlSeconds);
    }

    public List<DocumentDTO> listForApplication(Long applicationId) {
        List<Document> docs = documentRepository.findByApplicationIdAndUploadStatusNot(
                applicationId, Document.STATUS_DELETED);
        List<DocumentDTO> out = new ArrayList<>(docs.size());
        for (Document d : docs) out.add(toDTO(d));
        return out;
    }

    /**
     * Soft-delete: mark row as deleted and remove the S3 object best-effort.
     * Object Lock will preserve compliance retention; we don't try to bypass it.
     */
    @Transactional
    public void softDelete(String docUuid) {
        Document doc = documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + docUuid));

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(doc.getS3Key())
                    .build());
        } catch (AwsServiceException e) {
            // Object Lock or governance retention can refuse deletes — that's fine, keep the row marked deleted.
            log.info("S3 delete refused for {} ({}); marking row deleted regardless.",
                    doc.getS3Key(), e.awsErrorDetails().errorCode());
        }

        doc.setUploadStatus(Document.STATUS_DELETED);
        documentRepository.save(doc);
    }

    private void applyLifecycleTags(Document doc) {
        List<Tag> tags = List.of(
                tag("loan_state", "active"),
                tag("sensitivity", "borrower-pii"),
                tag("retention_class", "standard"),
                tag("source", doc.getPartyRole() != null ? doc.getPartyRole() : "borrower"),
                tag("application_id", String.valueOf(doc.getApplication().getId())),
                tag("doc_uuid", doc.getDocUuid())
        );
        try {
            s3Client.putObjectTagging(PutObjectTaggingRequest.builder()
                    .bucket(bucket)
                    .key(doc.getS3Key())
                    .tagging(Tagging.builder().tagSet(tags).build())
                    .build());
        } catch (AwsServiceException e) {
            log.warn("Failed to apply tags to {}: {}", doc.getS3Key(), e.awsErrorDetails().errorMessage());
        }
    }

    private static Tag tag(String k, String v) {
        return Tag.builder().key(k).value(v).build();
    }

    private static String sanitizeSegment(String input) {
        String s = input.trim().toLowerCase(Locale.ROOT);
        s = s.replaceAll("[^a-z0-9_-]+", "-");
        s = s.replaceAll("-+", "-").replaceAll("^-|-$", "");
        return s.isEmpty() ? "other" : s;
    }

    private static String sanitizeFilename(String input) {
        String s = (input == null || input.isBlank()) ? "file" : input.trim();
        s = s.replace("\\", "/");
        int slash = s.lastIndexOf('/');
        if (slash >= 0) s = s.substring(slash + 1);
        s = s.replaceAll("[^A-Za-z0-9._-]+", "_");
        if (s.length() > 200) s = s.substring(0, 200);
        return s.isEmpty() ? "file" : s;
    }

    private DocumentDTO toDTO(Document d) {
        DocumentDTO dto = new DocumentDTO();
        dto.setId(d.getId());
        dto.setApplicationId(d.getApplication().getId());
        dto.setDocUuid(d.getDocUuid());
        dto.setDocumentType(d.getDocumentType());
        dto.setFileName(d.getFileName());
        dto.setSafeFilename(d.getSafeFilename());
        dto.setContentType(d.getContentType());
        dto.setFileSize(d.getFileSize());
        dto.setUploadStatus(d.getUploadStatus());
        dto.setPartyRole(d.getPartyRole());
        dto.setAddedByRole(d.getAddedByRole());
        dto.setVisibleToBorrower(d.getVisibleToBorrower());
        dto.setVisibleToAgent(d.getVisibleToAgent());
        dto.setUploadedAt(d.getUploadedAt());
        return dto;
    }
}
