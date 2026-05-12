package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.exception.BusinessValidationException;
import com.yourcompany.mortgage.model.Folder;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.FolderRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration coverage for the folder workspace — folder seeding is the
 * mechanism that makes a brand-new loan immediately usable, and system-folder
 * protection is what stops a stray click from blowing away the LO's mental
 * model of the file layout.
 */
@SpringBootTest
@ActiveProfiles("test")
class FolderServiceTest {

    @Autowired private FolderService folderService;
    @Autowired private LoanApplicationRepository loanApplicationRepository;
    @Autowired private FolderRepository folderRepository;

    private Long loanId;

    @BeforeEach
    void setUp() {
        LoanApplication la = new LoanApplication();
        la.setLoanPurpose("Purchase");
        la.setLoanType("Conventional");
        la.setStatus("REGISTERED");
        loanId = loanApplicationRepository.save(la).getId();
    }

    // ── Seeding ──────────────────────────────────────────────────────────────

    @Test
    void firstTreeFetch_autoSeedsRootPlusSystemFolders() {
        List<Folder> folders = folderService.getTreeForLoan(loanId);

        // Root + all active folder templates (17 by default)
        assertThat(folders).hasSizeGreaterThan(1);

        // The root is exactly one folder with parentId == null
        long roots = folders.stream().filter(f -> f.getParentId() == null).count();
        assertThat(roots).isEqualTo(1);

        // Every seeded subfolder is marked as a system folder so deletion is blocked
        folders.stream()
                .filter(f -> f.getParentId() != null)
                .forEach(f -> assertThat(f.getIsSystem()).isTrue());
    }

    @Test
    void seedIsIdempotent_repeatCallsDoNotDuplicate() {
        List<Folder> first = folderService.getTreeForLoan(loanId);
        List<Folder> second = folderService.getTreeForLoan(loanId);

        assertThat(second).hasSameSizeAs(first);
    }

    @Test
    void deleteFolder_isPresentAfterSeed() {
        folderService.getTreeForLoan(loanId);
        Optional<Folder> deleteFolder = folderService.findDeleteFolder(loanId);

        assertThat(deleteFolder).isPresent();
        assertThat(deleteFolder.get().getIsDeleteFolder()).isTrue();
    }

    // ── User-folder CRUD ─────────────────────────────────────────────────────

    @Test
    void createFolder_underRoot_succeeds() {
        Folder root = folderService.ensureSeeded(loanId);
        Folder created = folderService.createFolder(loanId, root.getId(), "Custom Notes", 1L);

        assertThat(created.getId()).isNotNull();
        assertThat(created.getDisplayName()).isEqualTo("Custom Notes");
        assertThat(created.getIsSystem()).isFalse();
    }

    @Test
    void createFolder_rejectsBlankName() {
        Folder root = folderService.ensureSeeded(loanId);

        assertThatThrownBy(() -> folderService.createFolder(loanId, root.getId(), "  ", 1L))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("required");
    }

    @Test
    void createFolder_rejectsDuplicateSiblingName() {
        Folder root = folderService.ensureSeeded(loanId);
        folderService.createFolder(loanId, root.getId(), "Shared Notes", 1L);

        // Case-insensitive collision — sibling-name uniqueness is normalized to lowercase
        assertThatThrownBy(() -> folderService.createFolder(loanId, root.getId(), "SHARED notes", 1L))
                .isInstanceOf(BusinessValidationException.class);
    }

    @Test
    void softDelete_rejectsSystemFolder() {
        folderService.ensureSeeded(loanId);
        List<Folder> all = folderService.getTreeForLoan(loanId);
        Folder systemFolder = all.stream()
                .filter(f -> Boolean.TRUE.equals(f.getIsSystem()) && f.getParentId() != null)
                .findFirst().orElseThrow();

        assertThatThrownBy(() -> folderService.softDelete(systemFolder.getId()))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Default");
    }

    @Test
    void softDelete_succeedsForUserFolder() {
        Folder root = folderService.ensureSeeded(loanId);
        Folder mine = folderService.createFolder(loanId, root.getId(), "Throwaway", 1L);

        folderService.softDelete(mine.getId());

        // Soft-deleted folder is no longer in the live tree
        assertThat(folderService.getTreeForLoan(loanId))
                .noneMatch(f -> f.getId().equals(mine.getId()));
    }

    @Test
    void renameFolder_updatesDisplayName() {
        Folder root = folderService.ensureSeeded(loanId);
        Folder mine = folderService.createFolder(loanId, root.getId(), "Old Name", 1L);

        Folder renamed = folderService.renameFolder(mine.getId(), "New Name");

        assertThat(renamed.getDisplayName()).isEqualTo("New Name");
    }
}
