package com.msfg.mortgage.controller;

import com.msfg.mortgage.repository.AppSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(roles = "Admin")
@Transactional
class AdminAppSettingsControllerTest {

    @Autowired private AdminAppSettingsController controller;
    @Autowired private AppSettingsRepository repo;

    @Test
    void get_returnsCurrentSettings() {
        var resp = controller.get();
        assertThat(resp.getBody()).isNotNull();
        // V25 default
        assertThat(resp.getBody().llmDefaultProvider()).isEqualTo("anthropic");
    }

    @Test
    void update_togglesAiEvalEnabled() {
        var resp = controller.update(new AdminAppSettingsController.UpdateRequest(
                true, null, null));
        assertThat(((com.msfg.mortgage.dto.AppSettingsDTO) resp.getBody()).aiEvalEnabled()).isTrue();
        assertThat(repo.singleton().getAiEvalEnabled()).isTrue();
    }

    @Test
    void update_acceptsKnownProvider() {
        var resp = controller.update(new AdminAppSettingsController.UpdateRequest(
                null, "openai", "gpt-4o-mini"));
        var body = (com.msfg.mortgage.dto.AppSettingsDTO) resp.getBody();
        assertThat(body.llmDefaultProvider()).isEqualTo("openai");
        assertThat(body.llmDefaultModel()).isEqualTo("gpt-4o-mini");
    }

    @Test
    void update_rejectsUnknownProvider() {
        var resp = controller.update(new AdminAppSettingsController.UpdateRequest(
                null, "skynet", null));
        assertThat(resp.getStatusCode().value()).isEqualTo(400);
    }
}
