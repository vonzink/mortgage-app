package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.exception.BusinessValidationException;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.Document;
import com.yourcompany.mortgage.model.DocumentStatus;
import com.yourcompany.mortgage.model.DocumentStatusHistory;
import com.yourcompany.mortgage.model.DocumentType;
import com.yourcompany.mortgage.model.Folder;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.User;
import com.yourcompany.mortgage.repository.DocumentRepository;
import com.yourcompany.mortgage.repository.DocumentStatusHistoryRepository;
import com.yourcompany.mortgage.repository.DocumentTypeRepository;
import com.yourcompany.mortgage.repository.FolderRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import com.yourcompany.mortgage.security.CurrentUserService;
import com.yourcompany.mortgage.security.LoanAccessGuard;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentStatusHistoryRepository statusHistoryRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final FolderRepository folderRepository;
    private final FolderService folderService;
    private final S3DocumentService s3;
    private final CurrentUserService currentUserService;
    private final LoanAccessGuard loanAccessGuard;
    private final AuditService auditService;

    // ─── Upload URL ─────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> issueUploadUrl(Long loanId, String fileName, String documentType,
                                                String partyRole, String contentType, Long folderId,
                                                Long documentTypeId,
                                                HttpServletRequest request) {
        LoanApplication la = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan application " + loanId + " not found"));

        String validRole = S3DocumentService.requireValidPartyRole(partyRole);
        String docType = documentType == null ? "Other" : documentType.trim();
        String safeName = S3DocumentService.sanitizeFilename(fileName);
        String docUuid = UUID.randomUUID().toString();

        // Resolve structured document type if provided
        DocumentType resolvedType = null;
        if (documentTypeId != null) {
            resolvedType = documentTypeRepository.findById(documentTypeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Document type " + documentTypeId + " not found"));
            docType = resolvedType.getName();

            // Validate MIME type against allowed types
            if (contentType != null && resolvedType.getAllowedMimeTypes() != null) {
                String normalizedContent = contentType.toLowerCase().split(";")[0].trim();
                boolean allowed = java.util.Arrays.stream(resolvedType.getAllowedMimeTypes().split(","))
                        .map(String::trim)
                        .anyMatch(normalizedContent::equals);
                if (!allowed) {
                    throw new BusinessValidationException(
                            "File type '" + contentType + "' is not allowed for " + resolvedType.getName()
                                    + ". Allowed: " + resolvedType.getAllowedMimeTypes());
                }
            }
        }

        String key = s3.buildApplicationKey(la.getId(), validRole, docType, docUuid, safeName);

        Long resolvedFolderId = resolveFolderId(loanId, folderId);
        // Auto-route by document type's default folder if no folder specified
        if (resolvedFolderId == null && resolvedType != null && resolvedType.getDefaultFolderName() != null) {
            resolvedFolderId = findDefaultFolderForTag(loanId, resolvedType.getDefaultFolderName()).orElse(null);
        } else if (resolvedFolderId == null && documentType != null) {
            resolvedFolderId = findDefaultFolderForTag(loanId, documentType).orElse(null);
        }

        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);

        Document doc = Document.builder()
                .application(la)
                .documentType(docType)
                .documentTypeId(resolvedType != null ? resolvedType.getId() : null)
                .fileName(fileName)
                .safeFilename(safeName)
                .docUuid(docUuid)
                .filePath(key)
                .contentType(contentType)
                .uploadStatus("pending")
                .partyRole(validRole)
                .addedByRole(validRole)
                .uploadedByUserId(userId)
                .visibleToBorrower(resolvedType != null ? resolvedType.getBorrowerVisibleDefault() : true)
                .visibleToAgent("agent".equals(validRole))
                .folderId(resolvedFolderId)
                .build();
        doc = documentRepository.save(doc);

        String uploadUrl = s3.presignUpload(key, contentType);

        auditService.logDocumentAction(loanId, doc.getId(), "UPLOAD_INITIATED",
                userId, validRole,
                Map.of("fileName", fileName, "docUuid", docUuid, "documentType", docType),
                request);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("documentId", doc.getId());
        body.put("docUuid", docUuid);
        body.put("s3Key", key);
        body.put("bucket", s3.getBucket());
        body.put("uploadUrl", uploadUrl);
        body.put("contentType", contentType);
        body.put("expiresInSeconds", 900);
        return body;
    }

    // ─── Confirm Upload ─────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> confirmUpload(Long loanId, String docUuid, HttpServletRequest request) {
        Document doc = findByUuidAndLoan(docUuid, loanId);

        long size = s3.verifyUpload(doc.getFilePath());
        if (size < 0) {
            log.warn("Confirm requested for {} but S3 HEAD returned NoSuchKey", doc.getFilePath());
            throw new BusinessValidationException("No object found at S3 key: " + doc.getFilePath());
        }

        doc.setFileSize(size);
        doc.setUploadStatus("uploaded");
        doc.setDocumentStatus(DocumentStatus.UPLOADED.name());

        // Compute SHA-256 best-effort. Null on failure (don't block confirm).
        String hash = s3.computeSha256(doc.getFilePath());
        if (hash != null) doc.setFileHash(hash);

        Document saved = documentRepository.save(doc);

        recordStatusTransition(doc.getId(), DocumentStatus.UPLOADED.name(), null, null);

        s3.applyTags(doc.getFilePath(),
                S3DocumentService.tagsForBorrowerUpload(doc.getApplication().getId(), null));

        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
        Map<String, Object> auditMeta = new java.util.LinkedHashMap<>();
        auditMeta.put("fileName", doc.getFileName());
        auditMeta.put("fileSize", size);
        auditMeta.put("docUuid", docUuid);
        if (hash != null) auditMeta.put("sha256", hash);
        auditService.logDocumentAction(loanId, doc.getId(), "UPLOAD",
                userId, doc.getPartyRole(), auditMeta, request);

        return toView(saved, false);
    }

    // ─── List ───────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> listDocuments(Long loanId, Long folderId,
                                                     boolean unfiled, boolean atRoot) {
        List<Document> docs = documentRepository.findUploadedByApplicationId(loanId);

        if (atRoot) {
            Long rootId = folderRepository.findRootByApplicationId(loanId)
                    .map(Folder::getId)
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

        if (!loanAccessGuard.isInternal()) {
            boolean asAgent = hasAuthority("ROLE_RealEstateAgent");
            docs = docs.stream()
                    .filter(d -> asAgent ? Boolean.TRUE.equals(d.getVisibleToAgent())
                            : Boolean.TRUE.equals(d.getVisibleToBorrower()))
                    .toList();
        }

        return docs.stream().map(d -> toView(d, false)).toList();
    }

    // ─── Download URL ───────────────────────────────────────────────────────────

    public Map<String, Object> issueDownloadUrl(Long loanId, String docUuid, HttpServletRequest request) {
        Document doc = findByUuidAndLoan(docUuid, loanId);
        if (!"uploaded".equals(doc.getUploadStatus())) {
            throw new BusinessValidationException("Upload not yet confirmed");
        }
        String url = s3.presignDownload(doc.getFilePath(), doc.getFileName());

        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
        String userRole = currentUserService.currentUser().map(User::getRole).orElse(null);
        auditService.logDocumentAction(loanId, doc.getId(), "DOWNLOAD",
                userId, userRole,
                Map.of("fileName", doc.getFileName(), "docUuid", docUuid),
                request);

        return Map.of("downloadUrl", url, "expiresInSeconds", 900);
    }

    // ─── Patch (rename, retype, move) ───────────────────────────────────────────

    @Transactional
    public Map<String, Object> patchDocument(Long loanId, String docUuid,
                                               String fileName, Long newFolderId, String documentType,
                                               String description, HttpServletRequest request) {
        Document doc = findByUuidAndLoan(docUuid, loanId);
        Map<String, Object> changes = new LinkedHashMap<>();

        if (fileName != null) {
            String trimmed = fileName.trim();
            if (trimmed.isEmpty()) {
                throw new BusinessValidationException("fileName must not be empty");
            }
            if (trimmed.length() > 255) {
                throw new BusinessValidationException("fileName must be 255 characters or fewer");
            }
            changes.put("oldFileName", doc.getFileName());
            changes.put("newFileName", trimmed);
            doc.setFileName(trimmed);
        }
        if (newFolderId != null) {
            changes.put("oldFolderId", doc.getFolderId());
            changes.put("newFolderId", newFolderId);
            doc.setFolderId(resolveFolderId(loanId, newFolderId));
        }
        if (documentType != null) {
            String dt = documentType.trim();
            if (dt.isEmpty()) {
                throw new BusinessValidationException("documentType must not be empty");
            }
            changes.put("oldDocumentType", doc.getDocumentType());
            changes.put("newDocumentType", dt);
            doc.setDocumentType(dt);
        }
        if (description != null) {
            doc.setDescription(description.length() > 1000 ? description.substring(0, 1000) : description);
        }

        Document saved = documentRepository.save(doc);

        if (!changes.isEmpty()) {
            Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
            String userRole = currentUserService.currentUser().map(User::getRole).orElse(null);
            auditService.logDocumentAction(loanId, doc.getId(), "RENAME",
                    userId, userRole, changes, request);
        }

        return toView(saved, false);
    }

    // ─── Move (bulk) ────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> moveDocuments(Long loanId, List<String> docUuids, Long toFolderId,
                                               HttpServletRequest request) {
        if (docUuids == null || docUuids.isEmpty()) {
            throw new BusinessValidationException("docUuids required");
        }

        Long target = (toFolderId == null) ? null : resolveFolderId(loanId, toFolderId);
        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
        String userRole = currentUserService.currentUser().map(User::getRole).orElse(null);

        int moved = 0;
        for (String uuid : docUuids) {
            Document doc = documentRepository.findByDocUuid(uuid)
                    .orElseThrow(() -> new ResourceNotFoundException("Document " + uuid + " not found"));
            if (!doc.getApplication().getId().equals(loanId)) {
                throw new BusinessValidationException("Document " + uuid + " belongs to a different loan");
            }
            Long current = doc.getFolderId();
            if ((current == null && target == null) || (current != null && current.equals(target))) {
                continue;
            }
            Long oldFolder = doc.getFolderId();
            doc.setFolderId(target);
            documentRepository.save(doc);
            moved++;

            auditService.logDocumentAction(loanId, doc.getId(), "MOVE",
                    userId, userRole,
                    Map.of("oldFolderId", oldFolder != null ? oldFolder : "root",
                            "newFolderId", target != null ? target : "root",
                            "docUuid", uuid),
                    request);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requested", docUuids.size());
        result.put("moved", moved);
        result.put("toFolderId", target);
        return result;
    }

    // ─── Soft Delete ────────────────────────────────────────────────────────────

    @Transactional
    public void softDelete(Long loanId, String docUuid, HttpServletRequest request) {
        Document doc = findByUuidAndLoan(docUuid, loanId);
        doc.setDeletedAt(LocalDateTime.now());
        documentRepository.save(doc);

        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
        String userRole = currentUserService.currentUser().map(User::getRole).orElse(null);
        auditService.logDocumentAction(loanId, doc.getId(), "SOFT_DELETE",
                userId, userRole,
                Map.of("fileName", doc.getFileName(), "docUuid", docUuid),
                request);
    }

    // ─── Permanent Delete ───────────────────────────────────────────────────────

    @Transactional
    public void permanentDelete(Long loanId, String docUuid, HttpServletRequest request) {
        Document doc = findByUuidAndLoan(docUuid, loanId);

        Long deleteFolderId = folderService.findDeleteFolder(loanId)
                .map(Folder::getId)
                .orElse(null);
        if (deleteFolderId == null) {
            throw new BusinessValidationException(
                    "This loan has no Delete folder yet. Open the workspace once to seed it.");
        }
        if (!deleteFolderId.equals(doc.getFolderId())) {
            throw new BusinessValidationException(
                    "Move the document into the Delete folder before permanently removing it.");
        }

        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
        String userRole = currentUserService.currentUser().map(User::getRole).orElse(null);

        // Audit before deletion so the record persists even if the row is removed
        auditService.logDocumentAction(loanId, doc.getId(), "PERMANENT_DELETE",
                userId, userRole,
                Map.of("fileName", doc.getFileName(), "docUuid", docUuid,
                        "filePath", doc.getFilePath() != null ? doc.getFilePath() : ""),
                request);

        if (doc.getFilePath() != null && !doc.getFilePath().isBlank()) {
            s3.deleteObject(doc.getFilePath());
        }

        doc.setDeletedAt(LocalDateTime.now());
        doc.setUploadStatus("deleted");
        documentRepository.save(doc);
    }

    // ─── Search ──────────────────────────────────────────────────────────────

    public Map<String, Object> searchDocuments(Long loanId, String status, Long documentTypeId,
                                                 Long folderId, Integer uploadedByUserId,
                                                 String fileName, int page, int size) {
        return searchDocuments(loanId, status, documentTypeId, folderId, uploadedByUserId,
                null, fileName, page, size);
    }

    public Map<String, Object> searchDocuments(Long loanId, String status, Long documentTypeId,
                                                 Long folderId, Integer uploadedByUserId,
                                                 String partyRole,
                                                 String fileName, int page, int size) {
        List<Document> all = documentRepository.findUploadedByApplicationId(loanId);

        // Apply filters
        var stream = all.stream();
        if (status != null && !status.isBlank()) {
            String s = status.toUpperCase();
            stream = stream.filter(d -> s.equals(d.getDocumentStatus()));
        }
        if (documentTypeId != null) {
            stream = stream.filter(d -> documentTypeId.equals(d.getDocumentTypeId()));
        }
        if (folderId != null) {
            stream = stream.filter(d -> folderId.equals(d.getFolderId()));
        }
        if (uploadedByUserId != null) {
            stream = stream.filter(d -> uploadedByUserId.equals(d.getUploadedByUserId()));
        }
        if (partyRole != null && !partyRole.isBlank()) {
            String pr = partyRole.toLowerCase();
            stream = stream.filter(d -> pr.equalsIgnoreCase(d.getPartyRole()));
        }
        if (fileName != null && !fileName.isBlank()) {
            String q = fileName.toLowerCase();
            stream = stream.filter(d -> d.getFileName() != null
                    && d.getFileName().toLowerCase().contains(q));
        }

        List<Document> filtered = stream.toList();
        int total = filtered.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<Document> paged = filtered.subList(fromIndex, toIndex);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalElements", total);
        result.put("totalPages", (int) Math.ceil((double) total / size));
        result.put("page", page);
        result.put("size", size);
        result.put("documents", paged.stream().map(d -> toView(d, false)).toList());
        return result;
    }

    // ─── Status Transition ────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> transitionStatus(Long loanId, String docUuid,
                                                  String newStatusStr, String note,
                                                  HttpServletRequest request) {
        Document doc = findByUuidAndLoan(docUuid, loanId);
        DocumentStatus current = DocumentStatus.fromString(doc.getDocumentStatus());
        DocumentStatus target = DocumentStatus.fromString(newStatusStr);

        if (!current.canTransitionTo(target)) {
            throw new BusinessValidationException(
                    "Cannot transition from " + current + " to " + target
                            + ". Valid transitions: " + current.validTransitions());
        }

        doc.setDocumentStatus(target.name());
        documentRepository.save(doc);

        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
        String userRole = currentUserService.currentUser().map(User::getRole).orElse(null);
        recordStatusTransition(doc.getId(), target.name(), userId, note);

        auditService.logDocumentAction(loanId, doc.getId(), "STATUS_CHANGE",
                userId, userRole,
                Map.of("oldStatus", current.name(), "newStatus", target.name(),
                        "docUuid", docUuid, "note", note != null ? note : ""),
                request);

        return toView(doc, false);
    }

    @Transactional
    public Map<String, Object> acceptDocument(Long loanId, String docUuid, String notes,
                                                HttpServletRequest request) {
        return reviewDocument(loanId, docUuid, DocumentStatus.ACCEPTED, notes, request);
    }

    @Transactional
    public Map<String, Object> rejectDocument(Long loanId, String docUuid, String notes,
                                                HttpServletRequest request) {
        if (notes == null || notes.isBlank()) {
            throw new BusinessValidationException("A note is required when rejecting a document");
        }
        return reviewDocument(loanId, docUuid, DocumentStatus.REJECTED, notes, request);
    }

    @Transactional
    public Map<String, Object> requestRevision(Long loanId, String docUuid, String notes,
                                                 HttpServletRequest request) {
        if (notes == null || notes.isBlank()) {
            throw new BusinessValidationException("A note is required when requesting revision");
        }
        return reviewDocument(loanId, docUuid, DocumentStatus.NEEDS_BORROWER_ACTION, notes, request);
    }

    private Map<String, Object> reviewDocument(Long loanId, String docUuid,
                                                 DocumentStatus targetStatus, String notes,
                                                 HttpServletRequest request) {
        Document doc = findByUuidAndLoan(docUuid, loanId);
        DocumentStatus current = DocumentStatus.fromString(doc.getDocumentStatus());

        if (!current.canTransitionTo(targetStatus)) {
            throw new BusinessValidationException(
                    "Cannot " + targetStatus.name().toLowerCase() + " a document in status " + current);
        }

        Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
        String userRole = currentUserService.currentUser().map(User::getRole).orElse(null);

        doc.setDocumentStatus(targetStatus.name());
        doc.setReviewedByUserId(userId);
        doc.setReviewerNotes(notes);
        doc.setReviewedAt(LocalDateTime.now());
        documentRepository.save(doc);

        recordStatusTransition(doc.getId(), targetStatus.name(), userId, notes);

        auditService.logDocumentAction(loanId, doc.getId(), "REVIEW",
                userId, userRole,
                Map.of("decision", targetStatus.name(), "docUuid", docUuid,
                        "notes", notes != null ? notes : ""),
                request);

        return toView(doc, false);
    }

    /**
     * Apply the same review decision (accept / reject / request-revision) to multiple
     * documents at once. Each transition runs through {@link #reviewDocument} so
     * source-state validation and audit logging stay consistent with the single-doc
     * path. Per-doc failures are collected; the whole call returns a summary instead
     * of failing the batch on the first bad transition.
     */
    @Transactional
    public Map<String, Object> bulkReview(Long loanId, List<String> docUuids,
                                            DocumentStatus targetStatus, String notes,
                                            HttpServletRequest request) {
        if (docUuids == null || docUuids.isEmpty()) {
            throw new BusinessValidationException("docUuids is required");
        }
        if ((targetStatus == DocumentStatus.REJECTED
                || targetStatus == DocumentStatus.NEEDS_BORROWER_ACTION)
                && (notes == null || notes.isBlank())) {
            throw new BusinessValidationException(
                    "A note is required for " + targetStatus.name().toLowerCase());
        }

        int succeeded = 0;
        List<Map<String, Object>> failures = new java.util.ArrayList<>();
        for (String uuid : docUuids) {
            try {
                reviewDocument(loanId, uuid, targetStatus, notes, request);
                succeeded++;
            } catch (Exception e) {
                Map<String, Object> f = new LinkedHashMap<>();
                f.put("docUuid", uuid);
                f.put("error", e.getMessage());
                failures.add(f);
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requested", docUuids.size());
        result.put("succeeded", succeeded);
        result.put("failed", failures.size());
        result.put("decision", targetStatus.name());
        result.put("failures", failures);
        return result;
    }

    public List<Map<String, Object>> getStatusHistory(Long loanId, String docUuid) {
        Document doc = findByUuidAndLoan(docUuid, loanId);
        return statusHistoryRepository.findByDocumentIdOrderByTransitionedAtDesc(doc.getId())
                .stream()
                .map(h -> {
                    Map<String, Object> v = new LinkedHashMap<>();
                    v.put("id", h.getId());
                    v.put("status", h.getStatus());
                    v.put("transitionedAt", h.getTransitionedAt());
                    v.put("transitionedByUserId", h.getTransitionedByUserId());
                    v.put("note", h.getNote());
                    return v;
                })
                .toList();
    }

    private void recordStatusTransition(Long documentId, String status,
                                          Integer userId, String note) {
        statusHistoryRepository.save(DocumentStatusHistory.builder()
                .documentId(documentId)
                .status(status)
                .transitionedByUserId(userId)
                .note(note)
                .build());
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    public Document findByUuidAndLoan(String docUuid, Long loanId) {
        Document doc = documentRepository.findByDocUuid(docUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Document " + docUuid + " not found"));
        if (!doc.getApplication().getId().equals(loanId)) {
            throw new BusinessValidationException("Document does not belong to loan " + loanId);
        }
        return doc;
    }

    Long resolveFolderId(Long loanId, Long requestedFolderId) {
        if (requestedFolderId == null) return null;
        Folder f = folderRepository.findActiveById(requestedFolderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Folder " + requestedFolderId + " not found"));
        if (!f.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Folder belongs to a different loan");
        }
        return f.getId();
    }

    Optional<Long> findDefaultFolderForTag(Long loanId, String tag) {
        if (tag == null || tag.isBlank()) return Optional.empty();
        String t = tag.trim().toLowerCase();
        switch (t) {
            case "borrower":     t = "borrower documents";  break;
            case "postclosing":
            case "post closing": t = "post closing";        break;
            case "correspondence": t = "correspondence";    break;
            case "invoice":      t = "invoices";            break;
            default: break;
        }
        String wanted = t;
        return folderRepository.findLiveByApplicationId(loanId).stream()
                .filter(f -> f.getParentId() != null)
                .filter(f -> {
                    String name = f.getDisplayName().toLowerCase();
                    return name.endsWith(" " + wanted) || name.equals(wanted);
                })
                .map(Folder::getId)
                .findFirst();
    }

    static boolean hasAuthority(String role) {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null) return false;
        for (var ga : auth.getAuthorities()) {
            if (role.equals(ga.getAuthority())) return true;
        }
        return false;
    }

    public static Map<String, Object> toView(Document d, boolean withDownloadUrl) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", d.getId());
        v.put("docUuid", d.getDocUuid());
        v.put("documentType", d.getDocumentType());
        v.put("documentTypeId", d.getDocumentTypeId());
        v.put("fileName", d.getFileName());
        v.put("fileSize", d.getFileSize());
        v.put("contentType", d.getContentType());
        v.put("partyRole", d.getPartyRole());
        v.put("uploadStatus", d.getUploadStatus());
        v.put("uploadedAt", d.getUploadedAt());
        v.put("folderId", d.getFolderId());
        v.put("description", d.getDescription());
        v.put("documentStatus", d.getDocumentStatus());
        v.put("reviewedByUserId", d.getReviewedByUserId());
        v.put("reviewerNotes", d.getReviewerNotes());
        v.put("reviewedAt", d.getReviewedAt());
        v.put("createdAt", d.getCreatedAt());
        v.put("updatedAt", d.getUpdatedAt());
        return v;
    }
}
