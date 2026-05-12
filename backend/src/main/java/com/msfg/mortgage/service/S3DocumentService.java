package com.msfg.mortgage.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectTaggingRequest;
import software.amazon.awssdk.services.s3.model.Tag;
import software.amazon.awssdk.services.s3.model.Tagging;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * S3 document storage. Owns:
 *   - building S3 keys per the agreed convention,
 *   - presigned PUT URLs for direct-from-browser uploads,
 *   - presigned GET URLs for downloads,
 *   - applying object tags (loan_state / sensitivity / retention_class / source / ids)
 *     after the upload completes,
 *   - sanity-checking that an object actually landed (HEAD).
 *
 * <p>Key convention (mirrors the bucket policy + lifecycle filters):
 * <pre>
 *   applications/{application_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
 *   loans/{loan_id}/{party_role}/{document_type}/{doc_uuid}-{safe_filename}
 * </pre>
 *
 * <p>Tag convention:
 * <pre>
 *   loan_state       active | funded | withdrawn | denied | canceled | incomplete
 *   sensitivity      public | internal | confidential | restricted
 *   retention_class  temporary | standard | compliance_archive
 *   source           borrower_portal | dashboard | los_admin | system
 *   application_id   {application_id}
 *   loan_id          {loan_id}             (optional — only set on loans/* keys)
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class S3DocumentService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.documents-bucket}")
    private String bucket;

    @Value("${aws.s3.presigned-url-ttl-seconds:900}")
    private long presignedTtlSeconds;

    // ─────────────────────────────────── Key building ───────────────────────────────────

    /** Build the S3 key for an application-stage document (no loan ID yet). */
    public String buildApplicationKey(long applicationId, String partyRole, String documentType,
                                      String docUuid, String safeFilename) {
        return String.format("applications/%d/%s/%s/%s-%s",
                applicationId, partyRole, documentType, docUuid, safeFilename);
    }

    /** Build the S3 key for a loan-stage document. */
    public String buildLoanKey(long loanId, String partyRole, String documentType,
                               String docUuid, String safeFilename) {
        return String.format("loans/%d/%s/%s/%s-%s",
                loanId, partyRole, documentType, docUuid, safeFilename);
    }

    /** Sanitize an uploaded filename for safe inclusion in an S3 key. */
    public static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "file";
        String name = filename.trim();
        // Strip any path traversal, keep just the base name
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) name = name.substring(slash + 1);
        // Replace anything that isn't [a-zA-Z0-9._-] with underscore
        name = name.replaceAll("[^a-zA-Z0-9._-]+", "_");
        // Strip leading dots (avoid hidden files / weird relative paths)
        name = name.replaceAll("^\\.+", "");
        if (name.isBlank()) name = "file";
        // Cap length to keep keys sane
        if (name.length() > 200) {
            int dot = name.lastIndexOf('.');
            String ext = (dot > 0 && name.length() - dot <= 8) ? name.substring(dot) : "";
            name = name.substring(0, 200 - ext.length()) + ext;
        }
        return name;
    }

    // ─────────────────────────────────── Presigned URLs ───────────────────────────────────

    /**
     * Issue a presigned PUT URL valid for {@code presignedTtlSeconds} (default 15 min).
     * The borrower's browser uses this to upload directly to S3 — backend never sees the bytes.
     */
    public String presignUpload(String key, String contentType) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType == null ? "application/octet-stream" : contentType)
                .build();

        PutObjectPresignRequest presign = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignedTtlSeconds))
                .putObjectRequest(putRequest)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presign);
        log.debug("Presigned PUT for key={} ({}s)", key, presignedTtlSeconds);
        return presigned.url().toString();
    }

    /**
     * Issue a presigned GET URL for downloading. Borrower portal links these in the document
     * list; the URL embeds the original filename for a sensible "Save as" prompt.
     */
    public String presignDownload(String key, String displayFilename) {
        GetObjectRequest.Builder get = GetObjectRequest.builder().bucket(bucket).key(key);
        if (displayFilename != null && !displayFilename.isBlank()) {
            get = get.responseContentDisposition("attachment; filename=\"" + displayFilename + "\"");
        }
        GetObjectPresignRequest presign = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(presignedTtlSeconds))
                .getObjectRequest(get.build())
                .build();
        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presign);
        return presigned.url().toString();
    }

    // ─────────────────────────────────── Tags + verification ───────────────────────────────────

    /**
     * Apply the agreed tag set after the upload completes. Lifecycle policies + Object Lock
     * decisions key off these.
     */
    public void applyTags(String key, Map<String, String> tags) {
        List<Tag> awsTags = new ArrayList<>(tags.size());
        tags.forEach((k, v) -> {
            if (v != null && !v.isBlank()) {
                awsTags.add(Tag.builder().key(k).value(v).build());
            }
        });
        s3Client.putObjectTagging(PutObjectTaggingRequest.builder()
                .bucket(bucket).key(key)
                .tagging(Tagging.builder().tagSet(awsTags).build())
                .build());
        log.debug("Applied {} tags to key={}", awsTags.size(), key);
    }

    /**
     * Confirm an object actually exists at the given key, returning its size in bytes.
     * Returns -1 if the object isn't there yet (borrower's upload never completed).
     */
    public long verifyUpload(String key) {
        try {
            HeadObjectResponse head = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket).key(key).build());
            return head.contentLength();
        } catch (NoSuchKeyException e) {
            return -1L;
        }
    }

    /**
     * Stream the object through a SHA-256 digester. Used at confirm time so the file_hash
     * column can serve as a tamper-detection / dedup signal. S3 ETag isn't a reliable
     * content hash for multipart uploads, so we hash the bytes ourselves.
     *
     * Returns null if the object isn't there or any I/O step fails — callers should treat
     * the hash as opportunistic, not load-bearing.
     */
    public String computeSha256(String key) {
        try (var stream = s3Client.getObject(GetObjectRequest.builder()
                .bucket(bucket).key(key).build())) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buf = new byte[8192];
            int n;
            while ((n = stream.read(buf)) != -1) {
                digest.update(buf, 0, n);
            }
            byte[] hash = digest.digest();
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchKeyException e) {
            log.warn("computeSha256: object missing at key={}", key);
            return null;
        } catch (Exception e) {
            log.warn("computeSha256 failed for key={}: {}", key, e.getMessage());
            return null;
        }
    }

    /**
     * Hard-delete an object. Used by the workspace's permanent-delete flow (LO drags a
     * file into the Delete folder, then confirms removal). Object Lock on the bucket
     * still gates this — locked objects throw and the controller surfaces a clear error.
     */
    public void deleteObject(String key) {
        s3Client.deleteObject(software.amazon.awssdk.services.s3.model.DeleteObjectRequest.builder()
                .bucket(bucket).key(key).build());
        log.info("Deleted s3://{}/{}", bucket, key);
    }

    public String getBucket() {
        return bucket;
    }

    // ─────────────────────────────────── Tag-set helpers ───────────────────────────────────

    /** Build the tag map for a borrower-uploaded document on an active application. */
    public static Map<String, String> tagsForBorrowerUpload(long applicationId, Long loanId) {
        Map<String, String> tags = new java.util.LinkedHashMap<>();
        tags.put("loan_state", loanId == null ? "incomplete" : "active");
        tags.put("sensitivity", "confidential");
        tags.put("retention_class", "standard");
        tags.put("source", "borrower_portal");
        tags.put("application_id", String.valueOf(applicationId));
        if (loanId != null) tags.put("loan_id", String.valueOf(loanId));
        return tags;
    }

    /** Validate a party_role value against the agreed enum. */
    public static String requireValidPartyRole(String partyRole) {
        if (partyRole == null) throw new IllegalArgumentException("party_role is required");
        String normalized = partyRole.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "borrower", "agent", "lo", "system" -> normalized;
            default -> throw new IllegalArgumentException(
                    "party_role must be borrower|agent|lo|system, got: " + partyRole);
        };
    }
}
