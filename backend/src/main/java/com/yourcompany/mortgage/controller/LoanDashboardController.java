package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.exception.BusinessValidationException;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.*;
import com.yourcompany.mortgage.repository.*;
import com.yourcompany.mortgage.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Loan Dashboard endpoints — read aggregated state and drive the LO's edits.
 *
 * <p>Read-side: GET /dashboard returns a single payload covering loan terms,
 * housing expenses, identifiers, primary borrower, property, status history,
 * loan agents, closing information, purchase credits, and outstanding conditions.
 *
 * <p>Write-side:
 * <ul>
 *   <li>PATCH /dashboard/terms — edit the loan_terms row in place.</li>
 *   <li>POST /dashboard/conditions — add a new UW condition.</li>
 *   <li>PATCH /dashboard/conditions/{id} — update a condition (status, due date,
 *       assignment, notes). The "clear" action is a status update.</li>
 *   <li>DELETE /dashboard/conditions/{id} — remove a condition (used for
 *       conditions added by mistake; cleared/waived ones stay for audit).</li>
 * </ul>
 *
 * <p>Status changes route through the existing PATCH /loan-applications/{id}/status
 * endpoint (writes loan_status_history). Closing-info edits and agent management
 * intentionally remain read-only here — they have their own controllers.
 */
@RestController
@RequestMapping("/loan-applications/{loanId}/dashboard")
@RequiredArgsConstructor
@Slf4j
public class LoanDashboardController {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanTermsRepository loanTermsRepository;
    private final HousingExpenseRepository housingExpenseRepository;
    private final PurchaseCreditRepository purchaseCreditRepository;
    private final LoanConditionRepository loanConditionRepository;
    private final LoanStatusHistoryRepository loanStatusHistoryRepository;
    private final LoanAgentRepository loanAgentRepository;
    private final ClosingInformationRepository closingInformationRepository;
    private final CurrentUserService currentUserService;

    // ─── Read aggregated dashboard ──────────────────────────────────────────

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

        Map<String, Object> identifiers = new LinkedHashMap<>();
        identifiers.put("lendingpadLoanNumber", la.getLendingpadLoanNumber());
        identifiers.put("investorLoanNumber", la.getInvestorLoanNumber());
        identifiers.put("mersMin", la.getMersMin());
        body.put("identifiers", identifiers);

        if (la.getBorrowers() != null && !la.getBorrowers().isEmpty()) {
            Borrower b = la.getBorrowers().get(0);
            Map<String, Object> primary = new LinkedHashMap<>();
            primary.put("firstName", b.getFirstName());
            primary.put("lastName", b.getLastName());
            primary.put("email", b.getEmail());
            primary.put("phone", b.getPhone());
            primary.put("maritalStatus", b.getMaritalStatus());
            primary.put("citizenshipType", b.getCitizenshipType());
            // Borrower intent to occupy lives on the Declaration; surface it next to the
            // borrower so the dashboard reads as one mental block ("about Sarah").
            if (b.getDeclaration() != null) {
                primary.put("intentToOccupy", b.getDeclaration().getIntentToOccupy());
            }
            body.put("primaryBorrower", primary);
        }

        if (la.getProperty() != null) {
            var p = la.getProperty();
            Map<String, Object> prop = new LinkedHashMap<>();
            prop.put("addressLine", p.getAddressLine());
            prop.put("city", p.getCity());
            prop.put("state", p.getState());
            prop.put("zipCode", p.getZipCode());
            prop.put("county", p.getCounty());
            // Naming: propertyType in the entity = MISMO PropertyUsageType (occupancy).
            // Re-label as propertyUse on the wire so the dashboard's labels match the URLA's.
            prop.put("propertyUse", p.getPropertyType());
            prop.put("propertyValue", p.getPropertyValue());
            prop.put("purchasePrice", p.getPurchasePrice());
            prop.put("attachmentType", p.getAttachmentType());
            prop.put("projectType", p.getProjectType());
            prop.put("constructionType", p.getConstructionType());
            prop.put("yearBuilt", p.getYearBuilt());
            prop.put("unitsCount", p.getUnitsCount());
            body.put("property", prop);
        }

        body.put("loanTerms", termsView(loanTermsRepository.findByApplicationId(loanId).orElse(null)));

        body.put("housingExpenses", housingExpenseRepository.findByApplicationIdOrdered(loanId)
                .stream().map(LoanDashboardController::housingView).toList());

        body.put("purchaseCredits", purchaseCreditRepository.findByApplicationIdOrdered(loanId)
                .stream().map(LoanDashboardController::creditView).toList());

        body.put("conditions", loanConditionRepository.findByApplicationIdOrdered(loanId)
                .stream().map(LoanDashboardController::conditionView).toList());

        // Repo returns ASC; dashboard wants newest-first.
        List<LoanStatusHistory> history = loanStatusHistoryRepository
                .findByLoanApplicationIdOrderByTransitionedAtAsc(loanId);
        java.util.Collections.reverse(history);
        body.put("statusHistory", history.stream().map(LoanDashboardController::statusHistoryView).toList());

        body.put("loanAgents", loanAgentRepository.findByApplicationId(loanId)
                .stream().map(LoanDashboardController::agentView).toList());

        body.put("closingInformation", closingView(
                closingInformationRepository.findByLoanApplicationId(loanId).orElse(null)));

        return ResponseEntity.ok(body);
    }

    // ─── Edit loan terms ────────────────────────────────────────────────────

    @PatchMapping("/terms")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    @Transactional
    public ResponseEntity<?> patchTerms(@PathVariable Long loanId, @RequestBody PatchTermsRequest req) {
        if (!loanApplicationRepository.existsById(loanId)) {
            throw new ResourceNotFoundException("Loan " + loanId + " not found");
        }
        LoanTerms terms = loanTermsRepository.findByApplicationId(loanId)
                .orElseGet(() -> LoanTerms.builder().applicationId(loanId).build());

        if (req.baseLoanAmount() != null) terms.setBaseLoanAmount(req.baseLoanAmount());
        if (req.noteAmount() != null) terms.setNoteAmount(req.noteAmount());
        if (req.noteRatePercent() != null) {
            // Sanity bounds — anything outside this is almost certainly user error.
            if (req.noteRatePercent().compareTo(BigDecimal.ZERO) < 0
                    || req.noteRatePercent().compareTo(new BigDecimal("99")) > 0) {
                throw new BusinessValidationException("noteRatePercent must be between 0 and 99");
            }
            terms.setNoteRatePercent(req.noteRatePercent());
        }
        if (req.amortizationType() != null) terms.setAmortizationType(req.amortizationType().trim());
        if (req.amortizationTermMonths() != null) terms.setAmortizationTermMonths(req.amortizationTermMonths());
        if (req.lienPriorityType() != null) terms.setLienPriorityType(req.lienPriorityType().trim());
        if (req.applicationReceivedDate() != null) terms.setApplicationReceivedDate(req.applicationReceivedDate());
        if (req.downPaymentAmount() != null) terms.setDownPaymentAmount(req.downPaymentAmount());

        loanTermsRepository.save(terms);
        return ResponseEntity.ok(termsView(terms));
    }

    public record PatchTermsRequest(
            BigDecimal baseLoanAmount,
            BigDecimal noteAmount,
            BigDecimal noteRatePercent,
            String amortizationType,
            Integer amortizationTermMonths,
            String lienPriorityType,
            LocalDate applicationReceivedDate,
            BigDecimal downPaymentAmount
    ) {}

    // ─── Conditions CRUD ────────────────────────────────────────────────────

    @PostMapping("/conditions")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    @Transactional
    public ResponseEntity<?> createCondition(@PathVariable Long loanId, @RequestBody ConditionRequest req) {
        if (!loanApplicationRepository.existsById(loanId)) {
            throw new ResourceNotFoundException("Loan " + loanId + " not found");
        }
        if (req.conditionText() == null || req.conditionText().isBlank()) {
            throw new BusinessValidationException("conditionText is required");
        }
        Long uid = currentUserService.currentUser().map(u -> (long) u.getId()).orElse(null);

        LoanCondition c = LoanCondition.builder()
                .applicationId(loanId)
                .conditionText(req.conditionText().trim())
                .conditionType(req.conditionType())
                .status(req.status() != null ? req.status() : "Outstanding")
                .assignedToUserId(req.assignedToUserId())
                .dueDate(req.dueDate())
                .notes(req.notes())
                .createdByUserId(uid)
                .build();
        loanConditionRepository.save(c);
        return ResponseEntity.ok(conditionView(c));
    }

    @PatchMapping("/conditions/{conditionId}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    @Transactional
    public ResponseEntity<?> updateCondition(@PathVariable Long loanId,
                                             @PathVariable Long conditionId,
                                             @RequestBody ConditionRequest req) {
        LoanCondition c = loanConditionRepository.findById(conditionId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition " + conditionId + " not found"));
        if (!c.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Condition belongs to a different loan");
        }

        if (req.conditionText() != null) c.setConditionText(req.conditionText().trim());
        if (req.conditionType() != null) c.setConditionType(req.conditionType());
        if (req.assignedToUserId() != null) c.setAssignedToUserId(req.assignedToUserId());
        if (req.dueDate() != null) c.setDueDate(req.dueDate());
        if (req.notes() != null) c.setNotes(req.notes());
        if (req.status() != null) {
            String old = c.getStatus();
            c.setStatus(req.status());
            // Stamp clearing details on the Cleared/Waived transition (idempotent).
            boolean transitioningToCleared =
                    !"Outstanding".equals(req.status()) && "Outstanding".equals(old);
            if (transitioningToCleared) {
                c.setClearedAt(LocalDateTime.now());
                c.setClearedByUserId(currentUserService.currentUser().map(u -> (long) u.getId()).orElse(null));
            } else if ("Outstanding".equals(req.status())) {
                // Reopening a cleared condition wipes the clear-stamp so we don't lie about it.
                c.setClearedAt(null);
                c.setClearedByUserId(null);
            }
        }
        loanConditionRepository.save(c);
        return ResponseEntity.ok(conditionView(c));
    }

    @DeleteMapping("/conditions/{conditionId}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    @Transactional
    public ResponseEntity<?> deleteCondition(@PathVariable Long loanId, @PathVariable Long conditionId) {
        LoanCondition c = loanConditionRepository.findById(conditionId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition " + conditionId + " not found"));
        if (!c.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Condition belongs to a different loan");
        }
        loanConditionRepository.delete(c);
        return ResponseEntity.noContent().build();
    }

    public record ConditionRequest(
            String conditionText,
            String conditionType,
            String status,
            Long assignedToUserId,
            LocalDate dueDate,
            String notes
    ) {}

    // ─── View shaping ───────────────────────────────────────────────────────

    private static Map<String, Object> termsView(LoanTerms t) {
        if (t == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("baseLoanAmount", t.getBaseLoanAmount());
        m.put("noteAmount", t.getNoteAmount());
        m.put("noteRatePercent", t.getNoteRatePercent());
        m.put("downPaymentAmount", t.getDownPaymentAmount());
        m.put("amortizationType", t.getAmortizationType());
        m.put("amortizationTermMonths", t.getAmortizationTermMonths());
        m.put("lienPriorityType", t.getLienPriorityType());
        m.put("applicationReceivedDate", t.getApplicationReceivedDate());
        return m;
    }

    private static Map<String, Object> housingView(HousingExpense h) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("expenseType", h.getExpenseType());
        m.put("timingType", h.getTimingType());
        m.put("paymentAmount", h.getPaymentAmount());
        return m;
    }

    private static Map<String, Object> creditView(PurchaseCredit pc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", pc.getId());
        m.put("creditType", pc.getCreditType());
        m.put("amount", pc.getAmount());
        m.put("source", pc.getSource());
        m.put("notes", pc.getNotes());
        return m;
    }

    private static Map<String, Object> conditionView(LoanCondition c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("conditionText", c.getConditionText());
        m.put("conditionType", c.getConditionType());
        m.put("status", c.getStatus());
        m.put("assignedToUserId", c.getAssignedToUserId());
        m.put("dueDate", c.getDueDate());
        m.put("clearedAt", c.getClearedAt());
        m.put("clearedByUserId", c.getClearedByUserId());
        m.put("notes", c.getNotes());
        m.put("createdAt", c.getCreatedAt());
        return m;
    }

    private static Map<String, Object> statusHistoryView(LoanStatusHistory h) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", h.getStatus());
        m.put("transitionedAt", h.getTransitionedAt());
        m.put("transitionedByUserId", h.getTransitionedByUserId());
        m.put("note", h.getNote());
        return m;
    }

    private static Map<String, Object> agentView(LoanAgent a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("agentRole", a.getAgentRole());
        m.put("assignedAt", a.getAssignedAt());
        if (a.getAgentUser() != null) {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("id", a.getAgentUser().getId());
            u.put("email", a.getAgentUser().getEmail());
            u.put("displayName",
                    a.getAgentUser().getName() != null
                            ? a.getAgentUser().getName()
                            : a.getAgentUser().getEmail());
            m.put("user", u);
        }
        return m;
    }

    private static Map<String, Object> closingView(ClosingInformation ci) {
        if (ci == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("closingDate", ci.getClosingDate());
        m.put("closingTime", ci.getClosingTime());
        m.put("closingMethod", ci.getClosingMethod());
        m.put("closingCompanyName", ci.getClosingCompanyName());
        m.put("closingCompanyPhone", ci.getClosingCompanyPhone());
        m.put("titleCompanyName", ci.getTitleCompanyName());
        m.put("titleCompanyPhone", ci.getTitleCompanyPhone());
        m.put("titleCompanyEmail", ci.getTitleCompanyEmail());
        m.put("titleInsuranceAmount", ci.getTitleInsuranceAmount());
        m.put("appraisalMgmtCompany", ci.getAppraisalMgmtCompany());
        m.put("appraiserName", ci.getAppraiserName());
        return m;
    }
}
