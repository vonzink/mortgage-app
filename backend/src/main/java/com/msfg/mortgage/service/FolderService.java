package com.msfg.mortgage.service;

import com.msfg.mortgage.exception.BusinessValidationException;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.model.Borrower;
import com.msfg.mortgage.model.Folder;
import com.msfg.mortgage.model.FolderTemplate;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.repository.FolderRepository;
import com.msfg.mortgage.repository.FolderTemplateRepository;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Folder operations for the document workspace.
 *
 * <p>Current surface: read the tree, create the root + seeded default subfolders
 * idempotently on first access, create user folders, rename folders, soft-delete
 * user folders, and locate the system Delete folder used by document hard-delete.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final FolderTemplateRepository folderTemplateRepository;

    // ─── Read ────────────────────────────────────────────────────────────────────

    /**
     * Returns every live folder for a loan as a flat list. The tree shape is reconstructed
     * by the caller via {@code parentId}. Auto-seeds the root + default subfolders if the
     * loan has no folders yet.
     */
    @Transactional
    public List<Folder> getTreeForLoan(Long applicationId) {
        ensureSeeded(applicationId);
        return folderRepository.findLiveByApplicationId(applicationId);
    }

    public Folder getById(Long folderId) {
        return folderRepository.findActiveById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder " + folderId + " not found"));
    }

    // ─── Seed defaults ───────────────────────────────────────────────────────────

    /**
     * Creates the root + default subfolders for a loan if they don't already exist.
     * Safe to call repeatedly. Returns the loan's root folder.
     */
    @Transactional
    public Folder ensureSeeded(Long applicationId) {
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan " + applicationId + " not found"));

        Folder root = folderRepository.findRootByApplicationId(applicationId)
                .orElseGet(() -> createRoot(app));

        // Seed missing defaults idempotently. Templates are admin-managed in folder_templates;
        // existing user-created folders with the same name (case-insensitive collision)
        // cause the seed to silently skip that slot — the LO can rename their folder and
        // re-seed if they want the canonical layout.
        List<FolderTemplate> templates = folderTemplateRepository.findActiveOrdered();
        for (FolderTemplate tpl : templates) {
            String name = tpl.getDisplayName();
            String normalized = Folder.normalize(name);
            if (folderRepository.findSiblingByName(applicationId, root.getId(), normalized).isEmpty()) {
                Folder f = Folder.builder()
                        .applicationId(applicationId)
                        .parentId(root.getId())
                        .displayName(name)
                        .nameNormalized(normalized)
                        .sortKey(tpl.getSortKey() != null
                                ? tpl.getSortKey()
                                : (name.length() >= 2 ? name.substring(0, 2) : null))
                        .isSystem(true)
                        .isOldLoanArchive(Boolean.TRUE.equals(tpl.getIsOldLoanArchive()))
                        .isDeleteFolder(Boolean.TRUE.equals(tpl.getIsDeleteFolder()))
                        .build();
                folderRepository.save(f);
            }
        }
        return root;
    }

    /** The loan's Delete folder, or empty if seed hasn't run yet. */
    public Optional<Folder> findDeleteFolder(Long applicationId) {
        return folderRepository.findLiveByApplicationId(applicationId).stream()
                .filter(f -> Boolean.TRUE.equals(f.getIsDeleteFolder()))
                .findFirst();
    }

    private Folder createRoot(LoanApplication app) {
        String rootName = rootDisplayNameFor(app);
        Folder root = Folder.builder()
                .applicationId(app.getId())
                .parentId(null)
                .displayName(rootName)
                .nameNormalized(Folder.normalize(rootName))
                .isSystem(true)
                .isOldLoanArchive(false)
                .isDeleteFolder(false)
                .build();
        return folderRepository.save(root);
    }

    /**
     * Default root name follows the spec: "{LastName}, {FirstName}" of the primary borrower.
     * Falls back to the application number if no primary borrower exists yet.
     */
    static String rootDisplayNameFor(LoanApplication app) {
        Optional<Borrower> primary = (app.getBorrowers() == null || app.getBorrowers().isEmpty())
                ? Optional.empty()
                : Optional.of(app.getBorrowers().get(0));
        return primary
                .map(b -> {
                    String last = nullIfBlank(b.getLastName());
                    String first = nullIfBlank(b.getFirstName());
                    if (last != null && first != null) return last + ", " + first;
                    if (last != null) return last;
                    if (first != null) return first;
                    return null;
                })
                .filter(s -> s != null && !s.isBlank())
                .orElseGet(() -> app.getApplicationNumber() != null
                        ? "Loan " + app.getApplicationNumber()
                        : "Loan " + app.getId());
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    // ─── Create / rename ─────────────────────────────────────────────────────────

    /**
     * Create a user folder under {@code parentId}. The parent must belong to the same loan.
     * Sibling display name must not collide (case-insensitive).
     */
    @Transactional
    public Folder createFolder(Long applicationId, Long parentId, String displayName, Long createdByUserId) {
        if (displayName == null || displayName.isBlank()) {
            throw new BusinessValidationException("Folder name is required");
        }
        if (displayName.length() > 255) {
            throw new BusinessValidationException("Folder name must be 255 characters or fewer");
        }

        Folder parent = folderRepository.findActiveById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parent folder " + parentId + " not found"));
        if (!parent.getApplicationId().equals(applicationId)) {
            throw new BusinessValidationException("Parent folder belongs to a different loan");
        }

        String trimmed = displayName.trim();
        String normalized = Folder.normalize(trimmed);
        folderRepository.findSiblingByName(applicationId, parentId, normalized).ifPresent(existing -> {
            throw new BusinessValidationException("A folder named \"" + existing.getDisplayName()
                    + "\" already exists here");
        });

        Folder f = Folder.builder()
                .applicationId(applicationId)
                .parentId(parentId)
                .displayName(trimmed)
                .nameNormalized(normalized)
                .isSystem(false)
                .isOldLoanArchive(false)
                .isDeleteFolder(false)
                .createdByUserId(createdByUserId)
                .build();
        return folderRepository.save(f);
    }

    /**
     * Soft-delete a user-created folder. System folders (the seeded defaults + the loan
     * root) refuse deletion — they're contracted into the dashboard's auto-routing and
     * the LO's mental model. Documents inside the deleted folder become "unfiled"
     * (folder_id stays the same in the DB; the next list query at root surfaces them).
     */
    @Transactional
    public void softDelete(Long folderId) {
        Folder f = folderRepository.findActiveById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder " + folderId + " not found"));
        if (Boolean.TRUE.equals(f.getIsSystem())) {
            throw new BusinessValidationException(
                    "Default folders cannot be deleted. Rename instead if you want to repurpose it.");
        }
        f.setDeletedAt(java.time.LocalDateTime.now());
        folderRepository.save(f);
    }

    /**
     * Rename an existing folder. System folders (the seeded defaults + the loan root) can be
     * renamed too — LOs sometimes want to drop the numeric prefix; we leave that policy
     * to the user. Sibling collision still applies.
     */
    @Transactional
    public Folder renameFolder(Long folderId, String newDisplayName) {
        if (newDisplayName == null || newDisplayName.isBlank()) {
            throw new BusinessValidationException("Folder name is required");
        }
        if (newDisplayName.length() > 255) {
            throw new BusinessValidationException("Folder name must be 255 characters or fewer");
        }

        Folder f = folderRepository.findActiveById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder " + folderId + " not found"));

        String trimmed = newDisplayName.trim();
        String normalized = Folder.normalize(trimmed);

        // Skip the collision check when the rename is a no-op (case change only)
        if (!normalized.equals(f.getNameNormalized())) {
            folderRepository.findSiblingByName(f.getApplicationId(), f.getParentId(), normalized)
                    .ifPresent(existing -> {
                        throw new BusinessValidationException(
                                "A folder named \"" + existing.getDisplayName() + "\" already exists here");
                    });
        }

        f.setDisplayName(trimmed);
        f.setNameNormalized(normalized);
        return folderRepository.save(f);
    }
}
