package com.msfg.mortgage.controller;

import com.msfg.mortgage.exception.BusinessValidationException;
import com.msfg.mortgage.model.Folder;
import com.msfg.mortgage.security.CurrentUserService;
import com.msfg.mortgage.service.FolderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Folder endpoints for the document workspace. Phase 1: tree, create, rename, seed.
 *
 * <p>All routes are gated by {@link com.msfg.mortgage.security.LoanAccessGuard}.
 * Folder mutations also check that the target folder belongs to the loan in the path —
 * the service throws {@link BusinessValidationException} on mismatch, which the global
 * handler turns into 400.
 */
@RestController
@RequestMapping("/loan-applications/{loanId}/folders")
@RequiredArgsConstructor
@Slf4j
public class FolderController {

    private final FolderService folderService;
    private final CurrentUserService currentUserService;

    /**
     * Returns the loan's folder tree as a flat list. Auto-seeds the root + 15 default
     * subfolders on first call. Caller reconstructs the tree from {@code parentId}.
     */
    @GetMapping
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> tree(@PathVariable Long loanId) {
        List<Folder> all = folderService.getTreeForLoan(loanId);
        Long rootId = all.stream()
                .filter(f -> f.getParentId() == null)
                .map(Folder::getId)
                .findFirst()
                .orElse(null);
        return ResponseEntity.ok(Map.of(
                "rootId", rootId,
                "count", all.size(),
                "folders", all.stream().map(this::toView).toList()
        ));
    }

    /** Idempotent re-seed; useful if the LO created their own structure and wants the defaults back. */
    @PostMapping("/seed-defaults")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> seedDefaults(@PathVariable Long loanId) {
        Folder root = folderService.ensureSeeded(loanId);
        return ResponseEntity.ok(Map.of("rootId", root.getId(), "rootName", root.getDisplayName()));
    }

    /**
     * Create a user folder. Body: {@code {parentId, displayName}}. Sibling collision
     * (case-insensitive) → 400.
     */
    @PostMapping
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> create(@PathVariable Long loanId, @RequestBody CreateFolderRequest req) {
        if (req == null || req.parentId() == null) {
            throw new BusinessValidationException("parentId is required");
        }
        Long uid = currentUserService.currentUser().map(u -> (long) u.getId()).orElse(null);
        Folder created = folderService.createFolder(loanId, req.parentId(), req.displayName(), uid);
        return ResponseEntity.ok(toView(created));
    }

    /**
     * Soft-delete a folder. System folders (the seeded defaults + loan root) refuse —
     * the service throws BusinessValidationException → 400. Documents in the folder
     * stay associated by folder_id, but the folder is hidden from the tree; root-view
     * queries still pick them up.
     */
    @DeleteMapping("/{folderId}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> delete(@PathVariable Long loanId, @PathVariable Long folderId) {
        Folder existing = folderService.getById(folderId);
        if (!existing.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Folder belongs to a different loan");
        }
        folderService.softDelete(folderId);
        return ResponseEntity.noContent().build();
    }

    /** Rename. Body: {@code {displayName}}. */
    @PatchMapping("/{folderId}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> rename(@PathVariable Long loanId,
                                    @PathVariable Long folderId,
                                    @RequestBody RenameFolderRequest req) {
        Folder existing = folderService.getById(folderId);
        if (!existing.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Folder belongs to a different loan");
        }
        Folder updated = folderService.renameFolder(folderId, req == null ? null : req.displayName());
        return ResponseEntity.ok(toView(updated));
    }

    // ─── DTO shaping ─────────────────────────────────────────────────────────

    private Map<String, Object> toView(Folder f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("parentId", f.getParentId());
        m.put("displayName", f.getDisplayName());
        m.put("sortKey", f.getSortKey());
        m.put("isSystem", f.getIsSystem());
        m.put("isOldLoanArchive", f.getIsOldLoanArchive());
        m.put("isDeleteFolder", f.getIsDeleteFolder());
        m.put("createdByUserId", f.getCreatedByUserId());
        m.put("createdAt", f.getCreatedAt());
        m.put("updatedAt", f.getUpdatedAt());
        return m;
    }

    public record CreateFolderRequest(Long parentId, String displayName) {}
    public record RenameFolderRequest(String displayName) {}
}
