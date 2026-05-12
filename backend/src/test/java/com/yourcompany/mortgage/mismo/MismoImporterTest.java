package com.yourcompany.mortgage.mismo;

import com.yourcompany.mortgage.model.ClosingFee;
import com.yourcompany.mortgage.model.ClosingInformation;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.ClosingFeeRepository;
import com.yourcompany.mortgage.repository.ClosingInformationRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.ActiveProfiles;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end MISMO importer tests against real LP exports for Veronica Sawaged (R008797).
 * Two fixtures cover the two formats LP emits today:
 *   sample-urla-fnm.xml — application-stage URLA-FNM
 *   sample-closing.xml  — closing-stage variant (URLA + CLOSING_INFORMATION + FEE_INFORMATION + MI_DATA)
 *
 * Goal: exercise importInto() against real bytes so refactors against the importer have a
 * regression net, and confirm closing-stage extraction picks up the data the URLA-only path
 * doesn't carry.
 */
@SpringBootTest
@ActiveProfiles("test")
class MismoImporterTest {

    @Autowired private MismoImporter importer;
    @Autowired private LoanApplicationRepository loanApplicationRepository;
    @Autowired private ClosingInformationRepository closingInformationRepository;
    @Autowired private ClosingFeeRepository closingFeeRepository;

    private LoanApplication freshLoan() {
        LoanApplication la = new LoanApplication();
        la.setLoanPurpose("Purchase");
        la.setLoanType("Conventional");
        la.setStatus("REGISTERED");
        return loanApplicationRepository.save(la);
    }

    private InputStream fixture(String name) throws Exception {
        return new ClassPathResource("mismo/" + name).getInputStream();
    }

    @Test
    void importsUrlaFnm_populatesBorrowerAndProperty() throws Exception {
        LoanApplication la = freshLoan();

        try (InputStream xml = fixture("sample-urla-fnm.xml")) {
            MismoImporter.ImportResult result = importer.importInto(la, xml);
            assertThat(result.changeCount()).isGreaterThan(0);
        }

        LoanApplication reloaded = loanApplicationRepository.findById(la.getId()).orElseThrow();
        assertThat(reloaded.getBorrowers()).isNotEmpty();
        assertThat(reloaded.getBorrowers().get(0).getFirstName()).isNotBlank();
        assertThat(reloaded.getProperty()).isNotNull();
        assertThat(reloaded.getProperty().getAddressLine()).isNotBlank();

        // URLA-FNM has no closing-stage data → no ClosingInformation row, no fees
        assertThat(closingInformationRepository.findByLoanApplicationId(la.getId())).isEmpty();
        assertThat(closingFeeRepository.findByApplicationIdOrderBySequenceNumberAsc(la.getId())).isEmpty();
    }

    @Test
    void importsClosingMismo_populatesClosingInformationAndFees() throws Exception {
        LoanApplication la = freshLoan();

        try (InputStream xml = fixture("sample-closing.xml")) {
            MismoImporter.ImportResult result = importer.importInto(la, xml);
            assertThat(result.changeCount()).isGreaterThan(0);
            assertThat(result.changes())
                    .extracting(MismoImporter.FieldChange::path)
                    .anyMatch(p -> p.startsWith("closing."));
            assertThat(result.changes())
                    .extracting(MismoImporter.FieldChange::path)
                    .contains("closingFees");
        }

        // Closing-stage row populated
        ClosingInformation ci = closingInformationRepository.findByLoanApplicationId(la.getId()).orElseThrow();
        assertThat(ci.getClosingDate()).isEqualTo(LocalDate.of(2026, 5, 18));
        assertThat(ci.getMiType()).isEqualTo("FHA");
        assertThat(ci.getMiUpfrontAmount()).isEqualByComparingTo(new BigDecimal("8612.00"));
        assertThat(ci.getHazardInsuranceEscrowed()).isTrue();

        // FEE_INFORMATION/FEES → closing_fees rows
        List<ClosingFee> fees = closingFeeRepository.findByApplicationIdOrderBySequenceNumberAsc(la.getId());
        // Diagnostic: dump types so a future fixture change is easy to debug
        if (fees.isEmpty() || fees.stream().noneMatch(f -> f.getFeeType() != null && f.getFeeType().contains("MI Upfront"))) {
            String types = fees.stream().map(ClosingFee::getFeeType).reduce((a, b) -> a + ", " + b).orElse("(none)");
            throw new AssertionError("Expected fees to include 'MI Upfront' — got: " + types);
        }
        assertThat(fees).hasSizeGreaterThanOrEqualTo(15);
        assertThat(fees).extracting(ClosingFee::getFeeType)
                .anyMatch(t -> t != null && t.contains("Appraisal"));
        // First MI Upfront fee should match the financed amount on the loan
        assertThat(fees.stream()
                .filter(f -> f.getFeeType() != null && f.getFeeType().contains("MI Upfront"))
                .findFirst().orElseThrow().getFeeAmount())
                .isEqualByComparingTo(new BigDecimal("8612"));
    }

    @Test
    void closingImport_isReplaceAll_secondImportSwapsFees() throws Exception {
        LoanApplication la = freshLoan();

        try (InputStream xml = fixture("sample-closing.xml")) {
            importer.importInto(la, xml);
        }
        long firstCount = closingFeeRepository.findByApplicationIdOrderBySequenceNumberAsc(la.getId()).size();
        assertThat(firstCount).isGreaterThan(0);

        try (InputStream xml = fixture("sample-closing.xml")) {
            importer.importInto(la, xml);
        }
        long secondCount = closingFeeRepository.findByApplicationIdOrderBySequenceNumberAsc(la.getId()).size();
        assertThat(secondCount).isEqualTo(firstCount); // not 2× — replace-all not append
    }
}
