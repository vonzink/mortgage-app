package com.msfg.mortgage.controller;

import com.msfg.mortgage.exception.BusinessValidationException;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.repository.DocumentTypeRepository;
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
 * Direct controller-level tests for the admin CRUD on {@code document_types}.
 * {@code @WithMockUser(roles = "Admin")} satisfies the
 * {@code @PreAuthorize("hasRole('Admin')")} guard at the class level; the
 * tests are after the business rules (slug uniqueness, deactivation behavior,
 * payload-to-entity mapping).
 */
@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(roles = "Admin")
class AdminDocumentTypeControllerTest {

    @Autowired private AdminDocumentTypeController controller;
    @Autowired private DocumentTypeRepository repository;

    private AdminDocumentTypeController.UpsertRequest req(String name, String slug) {
        return new AdminDocumentTypeController.UpsertRequest(
                name, slug, "03 Income", null,
                "application/pdf", 10_485_760L,
                true, true, 50);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> bodyOf(ResponseEntity<?> resp) {
        return (Map<String, Object>) resp.getBody();
    }

    @Test
    void create_persistsNewTypeWithGeneratedId() {
        ResponseEntity<?> resp = controller.create(req("Custom Form", "custom-form-" + System.nanoTime()));

        Map<String, Object> body = bodyOf(resp);
        assertThat(body).isNotNull();
        assertThat(body.get("id")).isNotNull();
        assertThat(body.get("name")).isEqualTo("Custom Form");
        assertThat(body.get("isActive")).isEqualTo(true);
    }

    @Test
    void create_rejectsDuplicateSlug() {
        String slug = "dup-slug-" + System.nanoTime();
        controller.create(req("First", slug));

        assertThatThrownBy(() -> controller.create(req("Second", slug)))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void update_changesNameAndFlags() {
        ResponseEntity<?> created = controller.create(req("Old Name", "to-update-" + System.nanoTime()));
        Long id = ((Number) bodyOf(created).get("id")).longValue();

        AdminDocumentTypeController.UpsertRequest patch = new AdminDocumentTypeController.UpsertRequest(
                "New Name", (String) bodyOf(created).get("slug"),
                "04 Assets", null, "application/pdf", 5_242_880L,
                false, true, 10);

        Map<String, Object> updated = bodyOf(controller.update(id, patch));
        assertThat(updated.get("name")).isEqualTo("New Name");
        assertThat(updated.get("defaultFolderName")).isEqualTo("04 Assets");
        assertThat(updated.get("borrowerVisibleDefault")).isEqualTo(false);
    }

    @Test
    void update_throwsForMissingId() {
        AdminDocumentTypeController.UpsertRequest patch = req("Whatever", "x-" + System.nanoTime());
        assertThatThrownBy(() -> controller.update(999_999L, patch))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deactivate_setsInactiveFlag() {
        ResponseEntity<?> created = controller.create(req("To Deactivate", "deact-" + System.nanoTime()));
        Long id = ((Number) bodyOf(created).get("id")).longValue();

        controller.deactivate(id);

        assertThat(repository.findById(id))
                .isPresent()
                .get()
                .extracting(t -> t.getIsActive())
                .isEqualTo(false);
    }

    @Test
    void listAll_returnsAtLeastTheSeededTypes() {
        Map<String, Object> body = bodyOf(controller.listAll());
        assertThat(body.get("count")).isNotNull();
        // V19 migration seeds 16 types; even if some are deactivated, listAll returns ALL.
        assertThat((Integer) body.get("count")).isGreaterThanOrEqualTo(16);
    }
}
