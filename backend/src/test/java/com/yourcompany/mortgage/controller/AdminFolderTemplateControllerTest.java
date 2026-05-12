package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.exception.BusinessValidationException;
import com.yourcompany.mortgage.repository.FolderTemplateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Admin CRUD coverage for {@code folder_templates}. The interesting rules here
 * are the singletons: only one Delete folder and only one Old Loan Archive
 * may exist at a time, and the Delete template can't be deactivated because
 * the rest of the codebase looks it up by flag (not by name).
 *
 * {@code @WithMockUser(roles = "Admin")} satisfies the controller-level
 * {@code @PreAuthorize("hasRole('Admin')")} guard for every test method.
 */
@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(roles = "Admin")
class AdminFolderTemplateControllerTest {

    @Autowired private AdminFolderTemplateController controller;
    @Autowired private FolderTemplateRepository repository;

    private AdminFolderTemplateController.UpsertRequest req(String name, boolean isOldLoanArchive,
                                                              boolean isDeleteFolder) {
        return new AdminFolderTemplateController.UpsertRequest(
                name, null, isOldLoanArchive, isDeleteFolder, true, 100);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> bodyOf(ResponseEntity<?> resp) {
        return (Map<String, Object>) resp.getBody();
    }

    @Test
    void create_succeedsForRegularFolder() {
        Map<String, Object> body = bodyOf(
                controller.create(req("99 Custom Audit Folder " + System.nanoTime(), false, false))
        );
        assertThat(body.get("id")).isNotNull();
        assertThat(body.get("isActive")).isEqualTo(true);
    }

    @Test
    void create_rejectsDuplicateDisplayName() {
        String name = "Duplicate Name " + System.nanoTime();
        controller.create(req(name, false, false));

        assertThatThrownBy(() -> controller.create(req(name, false, false)))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void create_secondDeleteFolderRejected() {
        // The V21 seed already includes "17 Delete" marked as isDeleteFolder=true,
        // so any attempt to create a second one must be blocked.
        assertThatThrownBy(() ->
                controller.create(req("Second Delete " + System.nanoTime(), false, true))
        )
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Delete folder");
    }

    @Test
    void create_secondOldLoanArchiveRejected() {
        // Likewise the V21 seed includes "16 Old Loan Files" as the archive — only one allowed.
        assertThatThrownBy(() ->
                controller.create(req("Second Archive " + System.nanoTime(), true, false))
        )
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Old Loan Archive");
    }

    @Test
    void deactivate_refusesDeleteFolderTemplate() {
        Long deleteId = repository.findAllOrdered().stream()
                .filter(t -> Boolean.TRUE.equals(t.getIsDeleteFolder()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Expected V21 seed to include the Delete template"))
                .getId();

        assertThatThrownBy(() -> controller.deactivate(deleteId))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Delete folder");
    }

    @Test
    void deactivate_succeedsForRegularTemplate() {
        Map<String, Object> created = bodyOf(
                controller.create(req("Throwaway " + System.nanoTime(), false, false))
        );
        Long id = ((Number) created.get("id")).longValue();

        controller.deactivate(id);

        assertThat(repository.findById(id))
                .isPresent()
                .get()
                .extracting(t -> t.getIsActive())
                .isEqualTo(false);
    }

    @Test
    void listAll_includesV21SeededTemplates() {
        Map<String, Object> body = bodyOf(controller.listAll());
        assertThat((Integer) body.get("count")).isGreaterThanOrEqualTo(17);
    }
}
