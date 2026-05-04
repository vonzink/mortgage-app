package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.dto.DocumentDTO;
import com.yourcompany.mortgage.service.S3DocumentService;
import com.yourcompany.mortgage.service.S3DocumentService.PresignedDownloadResponse;
import com.yourcompany.mortgage.service.S3DocumentService.PresignedUploadResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 3-step direct-to-S3 upload:
 *   1. POST /upload-url   → backend creates `pending` Document row + presigned PUT URL
 *   2. browser PUTs file to S3 (no backend involvement)
 *   3. PUT  /{docUuid}/confirm → backend HEADs object, applies tags, flips status to `uploaded`
 *
 * Endpoints are nested under loan-applications/{loanId}/... so Phase D can attach
 * @PreAuthorize("@loanAccessGuard.canAccess(#loanId)") at this layer without restructuring.
 */
@RestController
@RequestMapping("/loan-applications/{loanId}/documents")
@PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
public class DocumentController {

    private final S3DocumentService s3DocumentService;

    public DocumentController(S3DocumentService s3DocumentService) {
        this.s3DocumentService = s3DocumentService;
    }

    public record UploadUrlRequest(String documentType, String partyRole,
                                   String fileName, String contentType) {}

    public record RenameRequest(String displayName) {}

    @PostMapping("/upload-url")
    public ResponseEntity<PresignedUploadResponse> requestUploadUrl(
            @PathVariable Long loanId,
            @RequestBody UploadUrlRequest req) {
        PresignedUploadResponse resp = s3DocumentService.createPresignedUpload(
                loanId,
                req.documentType(),
                req.partyRole(),
                req.fileName(),
                req.contentType());
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/{docUuid}/confirm")
    public ResponseEntity<DocumentDTO> confirmUpload(
            @PathVariable Long loanId,
            @PathVariable String docUuid) {
        return ResponseEntity.ok(s3DocumentService.confirmUpload(docUuid));
    }

    @GetMapping
    public ResponseEntity<List<DocumentDTO>> list(@PathVariable Long loanId) {
        return ResponseEntity.ok(s3DocumentService.listForApplication(loanId));
    }

    @GetMapping("/{docUuid}/download-url")
    public ResponseEntity<PresignedDownloadResponse> downloadUrl(
            @PathVariable Long loanId,
            @PathVariable String docUuid) {
        return ResponseEntity.ok(s3DocumentService.createPresignedDownload(docUuid));
    }

    @PatchMapping("/{docUuid}")
    public ResponseEntity<DocumentDTO> rename(
            @PathVariable Long loanId,
            @PathVariable String docUuid,
            @RequestBody RenameRequest req) {
        return ResponseEntity.ok(s3DocumentService.rename(docUuid, req.displayName()));
    }

    @DeleteMapping("/{docUuid}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long loanId,
            @PathVariable String docUuid) {
        s3DocumentService.softDelete(docUuid);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
