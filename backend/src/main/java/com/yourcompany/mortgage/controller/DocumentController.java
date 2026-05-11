package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/loan-applications/{loanId}/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload-url")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> issueUploadUrl(
            @PathVariable Long loanId,
            @RequestBody UploadUrlRequest req,
            HttpServletRequest httpRequest
    ) {
        Map<String, Object> result = documentService.issueUploadUrl(
                loanId, req.fileName(), req.documentType(),
                req.partyRole(), req.contentType(), req.folderId(),
                req.documentTypeId(), httpRequest);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{docUuid}/confirm")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> confirmUpload(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.confirmUpload(loanId, docUuid, httpRequest));
    }

    @GetMapping
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> list(
            @PathVariable Long loanId,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "unfiled", required = false, defaultValue = "false") boolean unfiled,
            @RequestParam(value = "atRoot", required = false, defaultValue = "false") boolean atRoot
    ) {
        List<Map<String, Object>> items = documentService.listDocuments(loanId, folderId, unfiled, atRoot);
        return ResponseEntity.ok(Map.of("count", items.size(), "documents", items));
    }

    @GetMapping("/search")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> search(
            @PathVariable Long loanId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "documentTypeId", required = false) Long documentTypeId,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "uploadedBy", required = false) Integer uploadedByUserId,
            @RequestParam(value = "partyRole", required = false) String partyRole,
            @RequestParam(value = "q", required = false) String fileName,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(documentService.searchDocuments(
                loanId, status, documentTypeId, folderId, uploadedByUserId,
                partyRole, fileName, page, Math.min(size, 200)));
    }

    @GetMapping("/{docUuid}/download-url")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> issueDownloadUrl(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.issueDownloadUrl(loanId, docUuid, httpRequest));
    }

    @PatchMapping("/{docUuid}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> patch(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            @RequestBody PatchDocumentRequest req,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.patchDocument(
                loanId, docUuid,
                req != null ? req.fileName() : null,
                req != null ? req.folderId() : null,
                req != null ? req.documentType() : null,
                req != null ? req.description() : null,
                httpRequest));
    }

    @PostMapping("/move")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> moveDocuments(
            @PathVariable Long loanId,
            @RequestBody MoveDocumentsRequest req,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.moveDocuments(
                loanId, req.docUuids(), req.toFolderId(), httpRequest));
    }

    @PutMapping("/{docUuid}/status")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> transitionStatus(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            @RequestBody StatusTransitionRequest req,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.transitionStatus(
                loanId, docUuid, req.status(), req.note(), httpRequest));
    }

    @PostMapping("/{docUuid}/accept")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> accept(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            @RequestBody(required = false) ReviewRequest req,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.acceptDocument(
                loanId, docUuid, req != null ? req.notes() : null, httpRequest));
    }

    @PostMapping("/{docUuid}/reject")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> reject(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            @RequestBody ReviewRequest req,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.rejectDocument(
                loanId, docUuid, req.notes(), httpRequest));
    }

    @PostMapping("/{docUuid}/request-revision")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> requestRevision(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            @RequestBody ReviewRequest req,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(documentService.requestRevision(
                loanId, docUuid, req.notes(), httpRequest));
    }

    @PostMapping("/bulk-review")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> bulkReview(
            @PathVariable Long loanId,
            @RequestBody BulkReviewRequest req,
            HttpServletRequest httpRequest
    ) {
        com.yourcompany.mortgage.model.DocumentStatus status =
                com.yourcompany.mortgage.model.DocumentStatus.fromString(req.decision());
        return ResponseEntity.ok(documentService.bulkReview(
                loanId, req.docUuids(), status, req.notes(), httpRequest));
    }

    @GetMapping("/{docUuid}/status-history")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> getStatusHistory(
            @PathVariable Long loanId,
            @PathVariable String docUuid
    ) {
        return ResponseEntity.ok(Map.of(
                "docUuid", docUuid,
                "history", documentService.getStatusHistory(loanId, docUuid)));
    }

    @DeleteMapping("/{docUuid}/permanent")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> permanentDelete(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            HttpServletRequest httpRequest
    ) {
        documentService.permanentDelete(loanId, docUuid, httpRequest);
        return ResponseEntity.ok(Map.of("ok", true, "docUuid", docUuid));
    }

    public record UploadUrlRequest(
            @NotBlank String fileName,
            String documentType,
            @NotBlank String partyRole,
            String contentType,
            Long folderId,
            Long documentTypeId
    ) {}

    public record PatchDocumentRequest(String fileName, Long folderId, String documentType, String description) {}

    public record MoveDocumentsRequest(List<String> docUuids, Long toFolderId) {}

    public record StatusTransitionRequest(String status, String note) {}

    public record ReviewRequest(String notes) {}

    /** Decision: ACCEPTED | REJECTED | NEEDS_BORROWER_ACTION (case-insensitive). */
    public record BulkReviewRequest(
            @NotBlank String decision,
            List<String> docUuids,
            String notes
    ) {}
}
