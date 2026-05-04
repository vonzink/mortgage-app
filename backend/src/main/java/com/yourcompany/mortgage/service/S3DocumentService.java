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
import java.util.Set;
import java.util.UUID;

/**
 * Documents on S3, metadata in Postgres.
 *
 * <h2>Key convention</h2>
 * <pre>applications/{applicationId}/{partyRole}/{documentType}/{docUuid}-{safeFilename}</pre>
 * Generated server-side. Clients never supply or see the s3 key.
 *
 * <h2>Identity model</h2>
 * Public handle is {@link Document#getDocUuid()}. The s3 key is internal. The user-facing
 * label is {@link Document#getDisplayName()} (renameable). The original filename is preserved
 * for downloads and audit.
 */
@Service
public class S3DocumentService {

    private static final Logger log = LoggerFactory.getLogger(S3DocumentService.class);

    private static final Set<String> ALLOWED_PARTY_ROLES = Set.of("borrower", "agent", "lo", "system");

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final DocumentRepository documentRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final DocumentUploadValidator validator;

    @Value("${aws.s3.documents-bucket}")
    private String bucket;

    @Value("${aws.s3.presigned-ttl-seconds:900}")
    private long presignedTtlSeconds;

    public S3DocumentService(S3Client s3Client,
                             S3Presigner s3Presigner,
                             DocumentRepository documentRepository,
                             LoanApplicationRepository loanApplicationRepository,
                             DocumentUploadValidator validator) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.documentRepository = documentRepository;
        this.loanApplicationRepository = loanApplicationRepository;
        this.validator = validator;
    }

    public record PresignedUploadResponse(String docUuid, String uploadUrl,
                                          long expiresInSeconds, long maxBytes) {}

    public record PresignedDownloadResponse(String docUuid, String downloadUrl,
                                            String fileName, long expiresInSeconds) {}

    /**
     * Step 1: validate inputs, generate a server-side s3 key, persist a `pending`
     * Document row, and return a presigned PUT URL.
     */
    @Transactional
    public PresignedUploadResponse createPresignedUpload(Long applicationId,
                                                         String documentType,
                                                         String partyRole,
                                                         String fileName,
                                                         String contentType) {
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));

        validator.validateRequested(contentType, fileName);

        String safePartyRole = normalizePartyRole(partyRole);
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
        doc.setOriginalFilename(fileName);
        doc.setSafeFilename(safeFilename);
        doc.setDisplayName(fileName);   // user-renameable later
        doc.setContentType(contentType);
        doc.setPartyRole(safePartyRole);
        doc.setUploadedByRole(safePartyRole);
        doc.setUploadStatus(Document.STATUS_PENDING);
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
        return new PresignedUploadResponse(docUuid, presigned.url().toString(),
                presignedTtlSeconds, validator.getMaxUploadBytes());
    }

    /**
     * Step 3: HEAD the object, validate size, apply lifecycle tags, flip status to uploaded.
     * If the size check fails, the S3 object is deleted and the row marked failed.
     */
    @Transactional
    public DocumentDTO confirmUpload(String docUuid) {
        Document doc = loadByUuidStrict(docUuid);

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

        try {
            validator.validateUploadedSize(head.contentLength());
        } catch (RuntimeException e) {
            // Reject oversized uploads — yank the bytes and mark failed.
            bestEffortDelete(doc.getS3Key());
            doc.setUploadStatus(Document.STATUS_FAILED);
            documentRepository.save(doc);
            throw e;
        }

        doc.setFileSize(head.contentLength());
        if (doc.getContentType() == null) doc.setContentType(head.contentType());

        applyLifecycleTags(doc);

        doc.setUploadStatus(Document.STATUS_UPLOADED);
        documentRepository.save(doc);
        return toDTO(doc);
    }

    public PresignedDownloadResponse createPresignedDownload(String docUuid) {
        Document doc = loadByUuidStrict(docUuid);
        if (doc.isDeleted()) {
            throw new IllegalStateException("Document has been deleted");
        }
        if (!Document.STATUS_UPLOADED.equals(doc.getUploadStatus())) {
            throw new IllegalStateException("Document is not in uploaded state: " + doc.getUploadStatus());
        }

        // Use the original filename for the download — that's what the user expects.
        String downloadName = doc.getOriginalFilename() != null
                ? doc.getOriginalFilename()
                : doc.getSafeFilename();

        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(doc.getS3Key())
                .responseContentDisposition("attachment; filename=\"" + downloadName + "\"")
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignedTtlSeconds))
                .getObjectRequest(getRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        return new PresignedDownloadResponse(docUuid, presigned.url().toString(),
                downloadName, presignedTtlSeconds);
    }

    /** List non-deleted documents for an application. */
    public List<DocumentDTO> listForApplication(Long applicationId) {
        List<Document> docs = documentRepository.findByApplicationIdAndDeletedAtIsNull(applicationId);
        List<DocumentDTO> out = new ArrayList<>(docs.size());
        for (Document d : docs) out.add(toDTO(d));
        return out;
    }

    /** Dropbox-style rename. Updates display_name only; original filename and s3 key are immutable. */
    @Transactional
    public DocumentDTO rename(String docUuid, String newDisplayName) {
        if (newDisplayName == null || newDisplayName.isBlank()) {
            throw new IllegalArgumentException("displayName must not be empty");
        }
        Document doc = loadByUuidStrict(docUuid);
        if (doc.isDeleted()) throw new IllegalStateException("Document has been deleted");
        doc.setDisplayName(newDisplayName.trim());
        documentRepository.save(doc);
        return toDTO(doc);
    }

    /**
     * Soft delete: set deleted_at, best-effort delete the S3 object.
     * Object Lock / governance retention may refuse the S3 delete — that's fine,
     * the row is still hidden from listings.
     */
    @Transactional
    public void softDelete(String docUuid) {
        Document doc = loadByUuidStrict(docUuid);
        if (doc.isDeleted()) return;

        bestEffortDelete(doc.getS3Key());
        doc.setDeletedAt(LocalDateTime.now());
        documentRepository.save(doc);
    }

    // --- internals ---

    private Document loadByUuidStrict(String docUuid) {
        return documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + docUuid));
    }

    private void bestEffortDelete(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket).key(key).build());
        } catch (AwsServiceException e) {
            log.info("S3 delete refused for {} ({}); proceeding regardless.",
                    key, e.awsErrorDetails().errorCode());
        }
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

    private static String normalizePartyRole(String input) {
        String s = (input == null ? "borrower" : input).toLowerCase(Locale.ROOT).trim();
        return ALLOWED_PARTY_ROLES.contains(s) ? s : "borrower";
    }

    private static String sanitizeSegment(String input) {
        String s = input.trim().toLowerCase(Locale.ROOT);
        s = s.replaceAll("[^a-z0-9_-]+", "-");
        s = s.replaceAll("-+", "-").replaceAll("^-|-$", "");
        return s.isEmpty() ? "other" : s;
    }

    /**
     * Sanitize a user-supplied filename for use in an S3 key.
     * Preserves the extension; sanitizes the base; caps total length at 200.
     * Cannot collide with another object's key because docUuid prefixes the filename.
     */
    private static String sanitizeFilename(String input) {
        String s = (input == null || input.isBlank()) ? "file" : input.trim();
        s = s.replace("\\", "/");
        int slash = s.lastIndexOf('/');
        if (slash >= 0) s = s.substring(slash + 1);

        String base, ext;
        int dot = s.lastIndexOf('.');
        if (dot > 0 && dot < s.length() - 1) {
            base = s.substring(0, dot);
            ext = s.substring(dot + 1);
        } else {
            base = s;
            ext = "";
        }

        base = base.replaceAll("[^A-Za-z0-9._-]+", "_");
        ext = ext.replaceAll("[^A-Za-z0-9]+", "");

        if (base.isEmpty()) base = "file";

        // Cap base so total length stays manageable (200 chars including extension).
        int extLen = ext.isEmpty() ? 0 : ext.length() + 1;
        int maxBase = Math.max(1, 200 - extLen);
        if (base.length() > maxBase) base = base.substring(0, maxBase);

        return ext.isEmpty() ? base : base + "." + ext;
    }

    private DocumentDTO toDTO(Document d) {
        DocumentDTO dto = new DocumentDTO();
        dto.setId(d.getId());
        dto.setApplicationId(d.getApplication().getId());
        dto.setDocUuid(d.getDocUuid());
        dto.setDocumentType(d.getDocumentType());
        dto.setOriginalFilename(d.getOriginalFilename());
        dto.setSafeFilename(d.getSafeFilename());
        dto.setDisplayName(d.getDisplayName() != null ? d.getDisplayName() : d.getOriginalFilename());
        dto.setContentType(d.getContentType());
        dto.setFileSize(d.getFileSize());
        dto.setUploadStatus(d.getUploadStatus());
        dto.setPartyRole(d.getPartyRole());
        dto.setUploadedByRole(d.getUploadedByRole());
        dto.setUploadedByUserId(d.getUploadedByUserId());
        dto.setVisibleToBorrower(d.getVisibleToBorrower());
        dto.setVisibleToAgent(d.getVisibleToAgent());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());
        return dto;
    }
}
