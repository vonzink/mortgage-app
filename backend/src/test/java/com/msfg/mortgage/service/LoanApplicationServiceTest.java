package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.model.LoanApplication;
// (deleteApplication path tested separately — no exception expected for missing IDs)
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * End-to-end coverage of the {@link LoanApplicationService} CRUD surface.
 * Exercises real persistence through cascade-mapped relationships so a future
 * mapper or entity tweak surfaces as a test failure rather than a 500 in prod.
 */
@SpringBootTest
@ActiveProfiles("test")
class LoanApplicationServiceTest {

    @Autowired private LoanApplicationService loanApplicationService;

    private LoanApplicationDTO purchaseApplication(String loanPurpose) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose(loanPurpose);
        dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("492150.00"));
        dto.setPropertyValue(new BigDecimal("510000.00"));
        dto.setStatus("DRAFT");

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("17630 East 104th Place");
        p.setCity("Commerce City");
        p.setState("CO");
        p.setZipCode("80022");
        p.setPropertyType("PrimaryResidence");
        p.setPropertyValue(new BigDecimal("510000.00"));
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName("Veronica");
        b.setLastName("Sawaged");
        b.setEmail("vs@example.com");
        b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));

        return dto;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @Test
    void createApplication_persistsLoanWithProperty() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getApplicationNumber()).isNotBlank();
        assertThat(saved.getProperty()).isNotNull();
        assertThat(saved.getProperty().getAddressLine()).isEqualTo("17630 East 104th Place");
    }

    @Test
    void createApplication_cascadesBorrowerAndChildEntities() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));

        assertThat(saved.getBorrowers()).hasSize(1);
        assertThat(saved.getBorrowers().get(0).getFirstName()).isEqualTo("Veronica");
        assertThat(saved.getBorrowers().get(0).getApplication()).isSameAs(saved);
    }

    @Test
    void createApplication_assignsUniqueApplicationNumberPerSave() {
        LoanApplication first  = loanApplicationService.createApplication(purchaseApplication("Purchase"));
        LoanApplication second = loanApplicationService.createApplication(purchaseApplication("Refinance"));

        assertThat(first.getApplicationNumber()).isNotEqualTo(second.getApplicationNumber());
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Test
    void getApplicationById_returnsPersistedRecord() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));

        Optional<LoanApplication> fetched = loanApplicationService.getApplicationById(saved.getId());

        assertThat(fetched).isPresent();
        assertThat(fetched.get().getLoanPurpose()).isEqualTo("Purchase");
    }

    @Test
    void getApplicationById_emptyForMissingId() {
        assertThat(loanApplicationService.getApplicationById(999999L)).isEmpty();
    }

    @Test
    void getApplicationsByStatus_filtersCorrectly() {
        loanApplicationService.createApplication(purchaseApplication("Purchase"));   // DRAFT default
        LoanApplicationDTO funded = purchaseApplication("Refinance");
        funded.setStatus("FUNDED");
        loanApplicationService.createApplication(funded);

        List<LoanApplication> fundedOnly = loanApplicationService.getApplicationsByStatus("FUNDED");
        assertThat(fundedOnly).isNotEmpty();
        assertThat(fundedOnly).allMatch(a -> "FUNDED".equals(a.getStatus()));
    }

    // ── Update / status ──────────────────────────────────────────────────────

    @Test
    void updateApplicationStatus_changesStatusAndPersists() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));

        loanApplicationService.updateApplicationStatus(saved.getId(), "UNDERWRITING");

        LoanApplication reloaded = loanApplicationService.getApplicationById(saved.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo("UNDERWRITING");
    }

    @Test
    void updateApplicationStatus_throwsForMissingId() {
        assertThatThrownBy(() -> loanApplicationService.updateApplicationStatus(999999L, "FUNDED"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Test
    void deleteApplication_removesRecord() {
        LoanApplication saved = loanApplicationService.createApplication(purchaseApplication("Purchase"));

        loanApplicationService.deleteApplication(saved.getId());

        assertThat(loanApplicationService.getApplicationById(saved.getId())).isEmpty();
    }

    @Test
    void deleteApplication_isIdempotentForMissingId() {
        // Spring Data JPA's deleteById() is intentionally silent when the row is gone —
        // that's the documented contract since Spring Data 3.0. The service inherits it.
        // Locked in here so a future "throw if missing" tweak is a deliberate decision,
        // not a regression.
        loanApplicationService.deleteApplication(999_999L);
    }
}
