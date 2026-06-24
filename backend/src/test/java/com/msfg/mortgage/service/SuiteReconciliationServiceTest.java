package com.msfg.mortgage.service;

import com.msfg.mortgage.integration.SuiteClient;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Item-3 hardening: a funnel intake whose suite hand-off failed (suite_loan_id null) is re-driven —
 * once suite is reachable, {@code reconcileSuiteLoan} lands the suite loan id.
 */
@SpringBootTest
@ActiveProfiles("test")
class SuiteReconciliationServiceTest {

    @Autowired private LoanApplicationService service;
    @Autowired private LoanApplicationRepository repo;
    @MockBean private SuiteClient suiteClient;

    @Test
    void reconcileLandsSuiteLoanIdWhenSuiteReachable() {
        LoanApplication app = new LoanApplication();
        app.setLoanPurpose("Refinance");
        app.setSourceLeadId("lead-redrive-" + System.nanoTime());
        app.setStatus("REGISTERED");
        repo.save(app);
        assertThat(app.getSuiteLoanId()).isNull();

        when(suiteClient.createIntake(any(), any(), any(), any()))
                .thenReturn(new SuiteClient.SuiteLoanRef("suite-uuid-1", "1000000999"));

        service.reconcileSuiteLoan(app);

        assertThat(repo.findBySourceLeadId(app.getSourceLeadId()).orElseThrow().getSuiteLoanId())
                .isEqualTo("suite-uuid-1");
    }
}
