package com.msfg.mortgage.service;

import com.msfg.mortgage.config.DevIdentityProperties;
import com.msfg.mortgage.dto.IntakeRequest;
import com.msfg.mortgage.integration.SuiteClient;
import com.msfg.mortgage.mapper.LoanApplicationMapper;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.model.User;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import com.msfg.mortgage.repository.LoanStatusHistoryRepository;
import com.msfg.mortgage.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreateFromIntakeSuiteTest {

    @Test
    void createFromIntake_callsSuiteAndStoresSuiteLoanId() {
        // --- collaborator mocks ---
        LoanApplicationRepository repo = mock(LoanApplicationRepository.class);
        LoanStatusHistoryRepository histRepo = mock(LoanStatusHistoryRepository.class);
        LoanApplicationMapper mapper = mock(LoanApplicationMapper.class);
        UserRepository userRepo = mock(UserRepository.class);
        SuiteClient suite = mock(SuiteClient.class);

        DevIdentityProperties devIdentity = new DevIdentityProperties(
                "00000000-0000-0000-0000-0000000000b0",
                "Borrower",
                "00000000-0000-0000-0000-0000000000aa");

        // Constructor arg order: repo, histRepo, mapper, userRepo, suiteClient, devIdentity
        LoanApplicationService service = new LoanApplicationService(
                repo, histRepo, mapper, userRepo, suite, devIdentity);

        // --- stubs ---
        when(repo.findBySourceLeadId("lead-B2")).thenReturn(Optional.empty());
        // save returns its argument so suiteLoanId can be set on it
        when(repo.save(any(LoanApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(suite.createIntake(any(), anyString(), anyString(), anyString()))
                .thenReturn(new SuiteClient.SuiteLoanRef(
                        "22222222-2222-2222-2222-222222222222", "LN-9"));

        // --- build request ---
        IntakeRequest req = new IntakeRequest();
        req.setSourceLeadId("lead-B2");
        req.setLoanPurpose("Purchase");

        IntakeRequest.BorrowerInfo bi = new IntakeRequest.BorrowerInfo();
        bi.setFirstName("Jane");
        bi.setLastName("Doe");
        bi.setEmail("jane@example.com");
        req.setBorrower(bi);

        User caller = new User();
        caller.setId(1);

        // --- execute --- createFromIntake persists locally (in a tx); the suite hand-off is a separate
        // step the controller runs next (reconcileSuiteLoan), kept OUT of createFromIntake's transaction.
        LoanApplication app = service.createFromIntake(req, caller);
        service.reconcileSuiteLoan(app);

        // --- assert suite loan id stored ---
        assertThat(app.getSuiteLoanId()).isEqualTo("22222222-2222-2222-2222-222222222222");

        // --- assert suite was called with the dev sub ---
        verify(suite, times(1)).createIntake(
                any(),
                eq("00000000-0000-0000-0000-0000000000b0"),
                eq("Borrower"),
                anyString());
    }
}
