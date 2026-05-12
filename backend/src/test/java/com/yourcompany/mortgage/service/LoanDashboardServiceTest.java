package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.exception.BusinessValidationException;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Coverage of the LO-facing dashboard service: aggregated read, terms patching
 * (incl. range validation), conditions CRUD (incl. cross-loan rejection and the
 * Outstanding ↔ Cleared timestamp dance), and notes CRUD.
 *
 * Extracted from a 422-line controller in audit item CR-6 — these tests are
 * the regression net for the move.
 */
@SpringBootTest
@ActiveProfiles("test")
class LoanDashboardServiceTest {

    @Autowired private LoanDashboardService loanDashboardService;
    @Autowired private LoanApplicationRepository loanApplicationRepository;

    private Long loanId;

    @BeforeEach
    void setUp() {
        LoanApplication la = new LoanApplication();
        la.setLoanPurpose("Purchase");
        la.setLoanType("Conventional");
        la.setStatus("REGISTERED");
        loanId = loanApplicationRepository.save(la).getId();
    }

    // ── Read ──────────────────────────────────────────────────────────────

    @Test
    void getDashboard_returnsTopLevelShape() {
        Map<String, Object> body = loanDashboardService.getDashboard(loanId);

        assertThat(body)
                .containsKeys("loanId", "applicationNumber", "status", "identifiers",
                        "loanTerms", "housingExpenses", "purchaseCredits", "conditions",
                        "statusHistory", "loanAgents", "closingInformation", "notes");
        assertThat(body.get("loanId")).isEqualTo(loanId);
        assertThat(body.get("status")).isEqualTo("REGISTERED");
    }

    @Test
    void getDashboard_throwsForMissingLoan() {
        assertThatThrownBy(() -> loanDashboardService.getDashboard(999_999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── Terms patching ─────────────────────────────────────────────────────

    @Test
    void patchTerms_createsRowIfMissing() {
        LoanDashboardService.TermsPatch patch = new LoanDashboardService.TermsPatch(
                new BigDecimal("492150.00"), new BigDecimal("500762.00"),
                new BigDecimal("5.875"), "Fixed", 360, "FirstLien",
                LocalDate.of(2026, 4, 26), new BigDecimal("17850.00"));

        Map<String, Object> view = loanDashboardService.patchTerms(loanId, patch);

        assertThat(view.get("noteRatePercent")).isEqualTo(new BigDecimal("5.875"));
        assertThat(view.get("amortizationTermMonths")).isEqualTo(360);
    }

    @Test
    void patchTerms_rejectsAbsurdNoteRate() {
        LoanDashboardService.TermsPatch patch = new LoanDashboardService.TermsPatch(
                null, null, new BigDecimal("150.0"), null, null, null, null, null);

        assertThatThrownBy(() -> loanDashboardService.patchTerms(loanId, patch))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("between 0 and 99");
    }

    @Test
    void patchTerms_throwsForMissingLoan() {
        LoanDashboardService.TermsPatch patch = new LoanDashboardService.TermsPatch(
                null, null, new BigDecimal("6.0"), null, null, null, null, null);

        assertThatThrownBy(() -> loanDashboardService.patchTerms(999_999L, patch))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── Conditions ────────────────────────────────────────────────────────

    @Test
    void createCondition_persistsWithDefaultOutstandingStatus() {
        LoanDashboardService.ConditionInput input = new LoanDashboardService.ConditionInput(
                "Verify 2024 W-2 income", "Prior to Doc", null,
                null, LocalDate.now().plusDays(7), null);

        Map<String, Object> view = loanDashboardService.createCondition(loanId, input);

        assertThat(view.get("status")).isEqualTo("Outstanding");
        assertThat(view.get("conditionText")).isEqualTo("Verify 2024 W-2 income");
    }

    @Test
    void createCondition_rejectsBlankText() {
        LoanDashboardService.ConditionInput input = new LoanDashboardService.ConditionInput(
                "   ", "Prior to Doc", null, null, null, null);

        assertThatThrownBy(() -> loanDashboardService.createCondition(loanId, input))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("conditionText");
    }

    @Test
    void updateCondition_clearingStampsTimestamp() {
        Map<String, Object> created = loanDashboardService.createCondition(loanId,
                new LoanDashboardService.ConditionInput("Test condition", null, null, null, null, null));
        Long condId = ((Number) created.get("id")).longValue();

        // Outstanding → Cleared
        Map<String, Object> cleared = loanDashboardService.updateCondition(loanId, condId,
                new LoanDashboardService.ConditionInput(null, null, "Cleared", null, null, null));

        assertThat(cleared.get("status")).isEqualTo("Cleared");
        assertThat(cleared.get("clearedAt")).isNotNull();
    }

    @Test
    void updateCondition_reopeningWipesClearStamp() {
        Map<String, Object> created = loanDashboardService.createCondition(loanId,
                new LoanDashboardService.ConditionInput("Reopen test", null, null, null, null, null));
        Long condId = ((Number) created.get("id")).longValue();
        loanDashboardService.updateCondition(loanId, condId,
                new LoanDashboardService.ConditionInput(null, null, "Cleared", null, null, null));

        // Cleared → Outstanding — clearedAt must be wiped so the audit doesn't lie
        Map<String, Object> reopened = loanDashboardService.updateCondition(loanId, condId,
                new LoanDashboardService.ConditionInput(null, null, "Outstanding", null, null, null));

        assertThat(reopened.get("status")).isEqualTo("Outstanding");
        assertThat(reopened.get("clearedAt")).isNull();
    }

    @Test
    void updateCondition_rejectsCrossLoanAttempt() {
        Map<String, Object> created = loanDashboardService.createCondition(loanId,
                new LoanDashboardService.ConditionInput("Cross-loan attempt", null, null, null, null, null));
        Long condId = ((Number) created.get("id")).longValue();

        // Make a different loan and try to mutate the first loan's condition through it
        LoanApplication other = new LoanApplication();
        other.setLoanPurpose("Purchase");
        other.setLoanType("Conventional");
        other.setStatus("REGISTERED");
        Long otherLoanId = loanApplicationRepository.save(other).getId();

        assertThatThrownBy(() -> loanDashboardService.updateCondition(otherLoanId, condId,
                new LoanDashboardService.ConditionInput("Hijack", null, null, null, null, null)))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("different loan");
    }

    @Test
    void deleteCondition_removesRow() {
        Map<String, Object> created = loanDashboardService.createCondition(loanId,
                new LoanDashboardService.ConditionInput("To delete", null, null, null, null, null));
        Long condId = ((Number) created.get("id")).longValue();

        loanDashboardService.deleteCondition(loanId, condId);

        // After delete, the dashboard payload's conditions list is empty for this loan
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> remaining =
                (java.util.List<Map<String, Object>>) loanDashboardService.getDashboard(loanId).get("conditions");
        assertThat(remaining).noneMatch(m -> condId.equals(((Number) m.get("id")).longValue()));
    }

    // ── Notes ─────────────────────────────────────────────────────────────

    @Test
    void createNote_persistsAndAppearsInGetNotes() {
        loanDashboardService.createNote(loanId, "Underwriter needs updated paystubs.");

        java.util.List<Map<String, Object>> notes = loanDashboardService.getNotes(loanId);
        assertThat(notes).hasSize(1);
        assertThat(notes.get(0).get("content")).isEqualTo("Underwriter needs updated paystubs.");
    }

    @Test
    void createNote_rejectsBlankContent() {
        assertThatThrownBy(() -> loanDashboardService.createNote(loanId, "   "))
                .isInstanceOf(BusinessValidationException.class);
    }

    @Test
    void deleteNote_rejectsCrossLoanAttempt() {
        Map<String, Object> note = loanDashboardService.createNote(loanId, "Cross-loan note");
        Long noteId = ((Number) note.get("id")).longValue();

        LoanApplication other = new LoanApplication();
        other.setLoanPurpose("Purchase");
        other.setLoanType("Conventional");
        other.setStatus("REGISTERED");
        Long otherLoanId = loanApplicationRepository.save(other).getId();

        assertThatThrownBy(() -> loanDashboardService.deleteNote(otherLoanId, noteId))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("different loan");
    }
}
