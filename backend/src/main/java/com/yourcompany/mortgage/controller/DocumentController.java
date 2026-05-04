package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.Document;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.User;
import com.yourcompany.mortgage.repository.DocumentRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import com.yourcompany.mortgage.security.CurrentUserService;
import com.yourcompany.mortgage.service.S3DocumentService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Document upload + listing for a single loan application.
 *
 * <p>Flow (matches the agreed S3 architecture):
 * <ol>
 *   <li>{@code POST /loan-applications/{id}/documents/upload-url} — frontend asks for an
 *       upload slot. Backend creates a {@code Document} row with {@code upload_status='pending'},
 *       generates a fresh UUID for the key, returns the presigned PUT URL.</li>
 *   <li>Frontend PUTs the file directly to S3 using the URL.</li>
 *   <li>{@code PUT /loan-applications/{id}/documents/{docUuid}/confirm} — frontend reports
 *       upload finished. Backend HEADs S3 to verify, fills in file_size, applies tags,
 *       flips status to {@code uploaded}.</li>
 *   <li>{@code GET /loan-applications/{id}/documents} — borrower or LO lists docs (filtered
 *       by visibility flags for non-LO callers).</li>
 *   <li>{@code GET /loan-applications/{id}/documents/{docUuid}/download-url} — presigned GET.</li>
 * </ol>
 *
 * <p>All endpoints are gated by {@code LoanAccessGuard} for per-loan ownership.
 */
@RestController
@RequestMapping("/loan-applications/{loanId}/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentRepository documentRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final S3DocumentService s3;
    private final CurrentUserService currentUserService;

    // ─────────────────────────────────── Step 1: presigned upload ────────────────────

    @PostMapping("/upload-url")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> issueUploadUrl(
            @PathVariable Long loanId,
            @RequestBody UploadUrlRequest req
    ) {
        LoanApplication la = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan application " + loanId + " not found"));

        String partyRole = S3DocumentService.requireValidPartyRole(req.partyRole());
        String docType = req.documentType() == null ? "Other" : req.documentType().trim();
        String safeName = S3DocumentService.sanitizeFilename(req.fileName());
        String docUuid = UUID.randomUUID().toString();

        // Application-stage vs loan-stage: today everything is application-stage
        // (the loan_id IS the application_id while there's only one loan per app);
        // when the model splits, switch on la.getLoanNumber() != null.
        String key = s3.buildApplicationKey(la.getId(), partyRole, docType, docUuid, safeName);

        Document doc = Document.builder()
                .application(la)
                .documentType(docType)
                .fileName(req.fileName())
                .safeFilename(safeName)
                .docUuid(docUuid)
                .filePath(key)
                .contentType(req.contentType())
                .uploadStatus("pending")
                .partyRole(partyRole)
                .addedByRole(partyRole)
                .uploadedByUserId(currentUserService.currentUser().map(User::getId).orElse(null))
                .visibleToBorrower(true)
                .visibleToAgent("agent".equals(partyRole))
                .build();
        doc = documentRepository.save(doc);

        String uploadUrl = s3.presignUpload(key, req.contentType());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("documentId", doc.getId());
        body.put("docUuid", docUuid);
        body.put("s3Key", key);
        body.put("bucket", s3.getBucket());
        body.put("uploadUrl", uploadUrl);
        body.put("contentType", req.contentType());
        body.put("expiresInSeconds", 900);
        return ResponseEntity.ok(body);
    }

    // ─────────────────────────────────── Step 2: confirm upload ─────────────────────

    @PutMapping("/{docUuid}/confirm")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> confirmUpload(
            @PathVariable Long loanId,
            @PathVariable String docUuid
    ) {
        Document doc = documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Document " + docUuid + " not found"));
        if (!doc.getApplication().getId().equals(loanId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "doc/loan mismatch"));
        }

        long size = s3.verifyUpload(doc.getFilePath());
        if (size < 0) {
            log.warn("Confirm requested for {} but S3 HEAD returned NoSuchKey", doc.getFilePath());
            return ResponseEntity.unprocessableEntity()
                    .body(Map.of("error", "no_object_at_key", "key", doc.getFilePath()));
        }

        doc.setFileSize(size);
        doc.setUploadStatus("uploaded");
        Document saved = documentRepository.save(doc);

        // Apply tags now that the object exists
        s3.applyTags(doc.getFilePath(),
                S3DocumentService.tagsForBorrowerUpload(doc.getApplication().getId(), null));

        return ResponseEntity.ok(toView(saved, /*withDownloadUrl*/ false));
    }

    // ─────────────────────────────────── Step 3: list ────────────────────────────────

    @GetMapping
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> list(@PathVariable Long loanId) {
        List<Document> docs = documentRepository.findUploadedByApplicationId(loanId);

        // Filter for non-LO callers based on the visibility flags
        boolean internal = currentUserService.currentUser()
                .map(u -> List.of("admin", "manager", "lo", "processor").contains(u.getRole().toLowerCase()))
                .orElse(false);
        if (!internal) {
            boolean asAgent = currentUserService.currentUser()
                    .map(u -> "realestateagent".equals(u.getRole().toLowerCase()) || "agent".equals(u.getRole().toLowerCase()))
                    .orElse(false);
            docs = docs.stream()
                    .filter(d -> asAgent ? Boolean.TRUE.equals(d.getVisibleToAgent())
                                         : Boolean.TRUE.equals(d.getVisibleToBorrower()))
                    .toList();
        }

        List<Map<String, Object>> items = docs.stream().map(d -> toView(d, /*withDownloadUrl*/ false)).toList();
        return ResponseEntity.ok(Map.of("count", items.size(), "documents", items));
    }

    // ─────────────────────────────────── Step 4: download URL ────────────────────────

    @GetMapping("/{docUuid}/download-url")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> issueDownloadUrl(
            @PathVariable Long loanId,
            @PathVariable String docUuid
    ) {
        Document doc = documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Document " + docUuid + " not found"));
        if (!doc.getApplication().getId().equals(loanId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "doc/loan mismatch"));
        }
        if (!"uploaded".equals(doc.getUploadStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "upload_not_confirmed"));
        }
        String url = s3.presignDownload(doc.getFilePath(), doc.getFileName());
        return ResponseEntity.ok(Map.of("downloadUrl", url, "expiresInSeconds", 900));
    }

    // ─────────────────────────────────── helpers ─────────────────────────────────────

    private static Map<String, Object> toView(Document d, boolean withDownloadUrl) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", d.getId());
        v.put("docUuid", d.getDocUuid());
        v.put("documentType", d.getDocumentType());
        v.put("fileName", d.getFileName());
        v.put("fileSize", d.getFileSize());
        v.put("contentType", d.getContentType());
        v.put("partyRole", d.getPartyRole());
        v.put("uploadStatus", d.getUploadStatus());
        v.put("uploadedAt", d.getUploadedAt());
        return v;
    }

    /** Request body for {@code POST /upload-url}. */
    public record UploadUrlRequest(
            @NotBlank String fileName,
            @NotBlank String documentType,
            @NotBlank String partyRole,
            String contentType
    ) {}
}
