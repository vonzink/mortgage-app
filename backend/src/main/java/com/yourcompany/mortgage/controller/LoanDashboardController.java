package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.HousingExpense;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.LoanTerms;
import com.yourcompany.mortgage.repository.HousingExpenseRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import com.yourcompany.mortgage.repository.LoanTermsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Loan Dashboard — the LO's working view of a loan in flight.
 *
 * <p>Different concept from the application form: the URLA is borrower-filled
 * (name, income, residences, assets); the dashboard is LO-side data (terms,
 * housing expenses, identifiers, status, agents). MISMO imports populate it
 * initially; the LO edits as the loan progresses.
 *
 * <p>Phase 1 surface: read-only aggregated GET. Edit endpoints come next when
 * the dashboard UI grows past a viewer.
 */
@RestController
@RequestMapping("/loan-applications/{loanId}/dashboard")
@RequiredArgsConstructor
@Slf4j
public class LoanDashboardController {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanTermsRepository loanTermsRepository;
    private final HousingExpenseRepository housingExpenseRepository;

    @GetMapping
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> getDashboard(@PathVariable Long loanId) {
        LoanApplication la = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan " + loanId + " not found"));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("loanId", la.getId());
        body.put("applicationNumber", la.getApplicationNumber());
        body.put("status", la.getStatus());
        body.put("createdDate", la.getCreatedDate());
        body.put("updatedDate", la.getUpdatedDate());

        // Loan identifiers (V8) — already on LoanApplication
        Map<String, Object> identifiers = new LinkedHashMap<>();
        identifiers.put("lendingpadLoanNumber", la.getLendingpadLoanNumber());
        identifiers.put("investorLoanNumber", la.getInvestorLoanNumber());
        identifiers.put("mersMin", la.getMersMin());
        body.put("identifiers", identifiers);

        // Primary borrower (just enough for the header)
        if (la.getBorrowers() != null && !la.getBorrowers().isEmpty()) {
            Borrower b = la.getBorrowers().get(0);
            Map<String, Object> primary = new LinkedHashMap<>();
            primary.put("firstName", b.getFirstName());
            primary.put("lastName", b.getLastName());
            primary.put("email", b.getEmail());
            primary.put("phone", b.getPhone());
            body.put("primaryBorrower", primary);
        }

        // Property summary
        if (la.getProperty() != null) {
            Map<String, Object> prop = new LinkedHashMap<>();
            prop.put("addressLine", la.getProperty().getAddressLine());
            prop.put("city", la.getProperty().getCity());
            prop.put("state", la.getProperty().getState());
            prop.put("zipCode", la.getProperty().getZipCode());
            prop.put("county", la.getProperty().getCounty());
            prop.put("propertyType", la.getProperty().getPropertyType());
            prop.put("propertyValue", la.getProperty().getPropertyValue());
            prop.put("constructionType", la.getProperty().getConstructionType());
            prop.put("yearBuilt", la.getProperty().getYearBuilt());
            prop.put("unitsCount", la.getProperty().getUnitsCount());
            body.put("property", prop);
        }

        // Loan Terms (V12) — the new dashboard-specific row
        LoanTerms terms = loanTermsRepository.findByApplicationId(loanId).orElse(null);
        if (terms != null) {
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("baseLoanAmount", terms.getBaseLoanAmount());
            t.put("noteAmount", terms.getNoteAmount());
            t.put("noteRatePercent", terms.getNoteRatePercent());
            t.put("amortizationType", terms.getAmortizationType());
            t.put("amortizationTermMonths", terms.getAmortizationTermMonths());
            t.put("lienPriorityType", terms.getLienPriorityType());
            t.put("applicationReceivedDate", terms.getApplicationReceivedDate());
            body.put("loanTerms", t);
        } else {
            body.put("loanTerms", null);
        }

        // Housing expenses (V12) — PITIA breakdown
        List<HousingExpense> expenses = housingExpenseRepository.findByApplicationIdOrdered(loanId);
        body.put("housingExpenses", expenses.stream().map(h -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("expenseType", h.getExpenseType());
            m.put("timingType", h.getTimingType());
            m.put("paymentAmount", h.getPaymentAmount());
            return m;
        }).toList());

        return ResponseEntity.ok(body);
    }
}
