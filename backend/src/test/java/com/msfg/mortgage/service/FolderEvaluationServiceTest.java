package com.msfg.mortgage.service;

import com.msfg.mortgage.model.*;
import com.msfg.mortgage.repository.*;
import com.msfg.mortgage.service.llm.LlmProviderRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FolderEvaluationServiceTest {

    @Autowired private FolderEvaluationService service;
    @Autowired private FolderTemplateRepository folderTemplates;
    @Autowired private AppSettingsRepository appSettings;
    @Autowired private LoanApplicationService loanApplicationService;

    @MockBean private LlmProviderRegistry registry;

    private LoanApplication seedLoan() {
        var dto = new com.msfg.mortgage.dto.LoanApplicationDTO();
        dto.setLoanPurpose("Purchase"); dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("400000")); dto.setPropertyValue(new BigDecimal("500000"));
        var p = new com.msfg.mortgage.dto.PropertyDTO();
        p.setAddressLine("123 Main"); p.setCity("Lehi"); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence"); p.setPropertyValue(new BigDecimal("500000"));
        dto.setProperty(p);
        var b = new com.msfg.mortgage.dto.BorrowerDTO();
        b.setFirstName("Test"); b.setLastName("Borrower");
        b.setEmail("t@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(java.util.List.of(b));
        return loanApplicationService.createApplication(dto);
    }

    private FolderTemplate folderWithPrompt(String prompt) {
        FolderTemplate ft = FolderTemplate.builder()
                .displayName("Test Income " + System.nanoTime())
                .sortKey("03").sortOrder(99)
                .evalPrompt(prompt).build();
        return folderTemplates.save(ft);
    }

    @BeforeEach
    void setFeatureOnAndAnthropic() {
        AppSettings s = appSettings.singleton();
        s.setAiEvalEnabled(true);
        s.setLlmDefaultProvider("anthropic");
        s.setLlmDefaultModel("claude-sonnet-4-20250514");
        appSettings.save(s);
    }

    // ── feature toggle ────────────────────────────────────────────────────

    @Test
    void evaluate_returnsFeatureDisabled_whenToggleOff() {
        AppSettings s = appSettings.singleton();
        s.setAiEvalEnabled(false);
        appSettings.save(s);

        FolderTemplate ft = folderWithPrompt("Evaluate the income docs.");
        LoanApplication la = seedLoan();

        FolderEvaluation result = service.evaluate(la.getId(), ft.getId(), 1);

        assertThat(result.getStatus()).isEqualTo("feature_disabled");
        assertThat(result.getProviderCalled()).isFalse();
        verifyNoInteractions(registry);
    }

    // ── prompt missing ────────────────────────────────────────────────────

    @Test
    void evaluate_returnsNoPromptForFolder_whenPromptNull() {
        FolderTemplate ft = folderTemplates.save(FolderTemplate.builder()
                .displayName("No-prompt folder " + System.nanoTime())
                .sortKey("99").sortOrder(99).build());
        LoanApplication la = seedLoan();

        assertThatThrownBy(() -> service.evaluate(la.getId(), ft.getId(), 1))
            .hasMessageContaining("no_prompt_for_folder");
    }

    // ── no documents ──────────────────────────────────────────────────────

    @Test
    void evaluate_returnsNoDocuments_whenFolderEmpty() {
        FolderTemplate ft = folderWithPrompt("Evaluate.");
        LoanApplication la = seedLoan();

        FolderEvaluation result = service.evaluate(la.getId(), ft.getId(), 1);

        assertThat(result.getStatus()).isEqualTo("no_documents");
        assertThat(result.getProviderCalled()).isFalse();
        verifyNoInteractions(registry);
    }
}
