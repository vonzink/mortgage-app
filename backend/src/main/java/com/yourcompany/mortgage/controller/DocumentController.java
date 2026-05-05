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
    private final com.yourcompany.mortgage.repository.FolderRepository folderRepository;

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

        Long folderId = resolveFolderId(loanId, req.folderId());

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
                .folderId(folderId)
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
    public ResponseEntity<?> list(
            @PathVariable Long loanId,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "unfiled", required = false, defaultValue = "false") boolean unfiled,
            @RequestParam(value = "atRoot", required = false, defaultValue = "false") boolean atRoot
    ) {
        List<Document> docs = documentRepository.findUploadedByApplicationId(loanId);

        // Folder filter:
        //   atRoot=true       → docs filed at the loan's root folder OR unfiled (legacy null)
        //   unfiled=true      → only docs with folder_id IS NULL
        //   folderId=N        → only docs with that folder_id
        //   (none)            → everything (used for cross-folder views and search later)
        if (atRoot) {
            Long rootId = folderRepository.findRootByApplicationId(loanId)
                    .map(com.yourcompany.mortgage.model.Folder::getId)
                    .orElse(null);
            docs = docs.stream()
                    .filter(d -> d.getFolderId() == null
                            || (rootId != null && rootId.equals(d.getFolderId())))
                    .toList();
        } else if (unfiled) {
            docs = docs.stream().filter(d -> d.getFolderId() == null).toList();
        } else if (folderId != null) {
            docs = docs.stream()
                    .filter(d -> folderId.equals(d.getFolderId()))
                    .toList();
        }

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

    /**
     * Validates that the requested folder belongs to this loan and isn't deleted.
     * Returns null if the caller didn't supply a folderId (legacy borrower uploads).
     */
    private Long resolveFolderId(Long loanId, Long requestedFolderId) {
        if (requestedFolderId == null) return null;
        com.yourcompany.mortgage.model.Folder f = folderRepository.findActiveById(requestedFolderId)
                .orElseThrow(() -> new com.yourcompany.mortgage.exception.ResourceNotFoundException(
                        "Folder " + requestedFolderId + " not found"));
        if (!f.getApplicationId().equals(loanId)) {
            throw new com.yourcompany.mortgage.exception.BusinessValidationException(
                    "Folder belongs to a different loan");
        }
        return f.getId();
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

    // ─────────────────────────────────── Rename ─────────────────────────────────────

    /**
     * Rename a document (changes the user-visible {@code fileName}). The S3 key, original
     * upload metadata, and {@code safeFilename} are immutable — rename only affects what
     * the workspace and download link show.
     */
    @PatchMapping("/{docUuid}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> patch(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            @RequestBody PatchDocumentRequest req
    ) {
        Document doc = documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Document " + docUuid + " not found"));
        if (!doc.getApplication().getId().equals(loanId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "doc/loan mismatch"));
        }

        if (req != null && req.fileName() != null) {
            String trimmed = req.fileName().trim();
            if (trimmed.isEmpty()) {
                throw new com.yourcompany.mortgage.exception.BusinessValidationException(
                        "fileName must not be empty");
            }
            if (trimmed.length() > 255) {
                throw new com.yourcompany.mortgage.exception.BusinessValidationException(
                        "fileName must be 255 characters or fewer");
            }
            doc.setFileName(trimmed);
        }
        if (req != null && req.folderId() != null) {
            doc.setFolderId(resolveFolderId(loanId, req.folderId()));
        }
        Document saved = documentRepository.save(doc);
        return ResponseEntity.ok(toView(saved, /*withDownloadUrl*/ false));
    }

    public record PatchDocumentRequest(String fileName, Long folderId) {}

    // ─────────────────────────────────── Move (drag-drop / bulk) ────────────────────

    /**
     * Move one or more documents into a folder. Used by the workspace's drag-drop
     * (single doc) and the future bulk-action bar (multiple docs).
     *
     * <p>{@code toFolderId == null} means "unfile" — sets folder_id back to NULL.
     * The frontend uses this implicitly when a drop target is the loan root and
     * the LO wants legacy borrower-uploads to remain at root.
     *
     * <p>Per-doc validation: each doc must belong to {@code loanId}. The whole
     * request is rejected on the first mismatch — partial moves would leave the
     * UI in an ambiguous state.
     */
    @PostMapping("/move")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> moveDocuments(
            @PathVariable Long loanId,
            @RequestBody MoveDocumentsRequest req
    ) {
        if (req == null || req.docUuids() == null || req.docUuids().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "docUuids required"));
        }

        Long target = (req.toFolderId() == null) ? null
                : resolveFolderId(loanId, req.toFolderId());

        int moved = 0;
        for (String uuid : req.docUuids()) {
            Document doc = documentRepository.findByDocUuid(uuid)
                    .orElseThrow(() -> new ResourceNotFoundException("Document " + uuid + " not found"));
            if (!doc.getApplication().getId().equals(loanId)) {
                throw new com.yourcompany.mortgage.exception.BusinessValidationException(
                        "Document " + uuid + " belongs to a different loan");
            }
            // No-op if it's already there — saves a write and lets the UI fire
            // optimistic moves without worrying about idempotency.
            Long current = doc.getFolderId();
            if ((current == null && target == null) || (current != null && current.equals(target))) {
                continue;
            }
            doc.setFolderId(target);
            documentRepository.save(doc);
            moved++;
        }

        return ResponseEntity.ok(Map.of(
                "requested", req.docUuids().size(),
                "moved", moved,
                "toFolderId", target
        ));
    }

    public record MoveDocumentsRequest(List<String> docUuids, Long toFolderId) {}

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
        v.put("folderId", d.getFolderId());
        return v;
    }

    /** Request body for {@code POST /upload-url}. */
    public record UploadUrlRequest(
            @NotBlank String fileName,
            @NotBlank String documentType,
            @NotBlank String partyRole,
            String contentType,
            /** Optional. When supplied, the document is filed in this folder of the loan's
             *  workspace tree. The folder must belong to the same loan. Null = unfiled / root. */
            Long folderId
    ) {}
}
