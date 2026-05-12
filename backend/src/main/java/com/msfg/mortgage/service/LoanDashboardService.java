package com.msfg.mortgage.service;

import com.msfg.mortgage.exception.BusinessValidationException;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.model.*;
import com.msfg.mortgage.repository.*;
import com.msfg.mortgage.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Owns the read aggregation + write paths for the Loan Dashboard surface.
 *
 * Extracted from {@link com.msfg.mortgage.controller.LoanDashboardController}
 * (audit item CR-6) — the controller was 422 lines doing query orchestration,
 * validation, and view shaping inline. The service is the testable seam; the
 * controller now stays as a thin Spring-binding layer.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanDashboardService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanTermsRepository loanTermsRepository;
    private final HousingExpenseRepository housingExpenseRepository;
    private final PurchaseCreditRepository purchaseCreditRepository;
    private final LoanConditionRepository loanConditionRepository;
    private final LoanStatusHistoryRepository loanStatusHistoryRepository;
    private final LoanAgentRepository loanAgentRepository;
    private final ClosingInformationRepository closingInformationRepository;
    private final LoanNoteRepository loanNoteRepository;
    private final CurrentUserService currentUserService;

    // ─── Read aggregated dashboard ──────────────────────────────────────────

    public Map<String, Object> getDashboard(Long loanId) {
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
            // intentToOccupy lives on the Declaration; surface it next to the borrower
            // so the dashboard reads as one mental block ("about Sarah").
            if (b.getDeclaration() != null) {
                primary.put("intentToOccupy", b.getDeclaration().getIntentToOccupy());
            }
            body.put("primaryBorrower", primary);
        }

        if (la.getProperty() != null) {
            Property p = la.getProperty();
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
                .stream().map(LoanDashboardService::housingView).toList());

        body.put("purchaseCredits", purchaseCreditRepository.findByApplicationIdOrdered(loanId)
                .stream().map(LoanDashboardService::creditView).toList());

        body.put("conditions", loanConditionRepository.findByApplicationIdOrdered(loanId)
                .stream().map(LoanDashboardService::conditionView).toList());

        // Repo returns ASC; dashboard wants newest-first.
        List<LoanStatusHistory> history = loanStatusHistoryRepository
                .findByLoanApplicationIdOrderByTransitionedAtAsc(loanId);
        Collections.reverse(history);
        body.put("statusHistory", history.stream().map(LoanDashboardService::statusHistoryView).toList());

        body.put("loanAgents", loanAgentRepository.findByApplicationId(loanId)
                .stream().map(LoanDashboardService::agentView).toList());

        body.put("closingInformation", closingView(
                closingInformationRepository.findByLoanApplicationId(loanId).orElse(null)));

        body.put("notes", loanNoteRepository.findByApplicationIdOrderByCreatedAtDesc(loanId)
                .stream().map(LoanDashboardService::noteView).toList());

        return body;
    }

    // ─── Edit loan terms ────────────────────────────────────────────────────

    /** Patch loan terms; creates the row if it doesn't exist yet. */
    @Transactional
    public Map<String, Object> patchTerms(Long loanId, TermsPatch patch) {
        if (!loanApplicationRepository.existsById(loanId)) {
            throw new ResourceNotFoundException("Loan " + loanId + " not found");
        }
        LoanTerms terms = loanTermsRepository.findByApplicationId(loanId)
                .orElseGet(() -> LoanTerms.builder().applicationId(loanId).build());

        if (patch.baseLoanAmount() != null) terms.setBaseLoanAmount(patch.baseLoanAmount());
        if (patch.noteAmount() != null) terms.setNoteAmount(patch.noteAmount());
        if (patch.noteRatePercent() != null) {
            // Sanity bounds — anything outside this is almost certainly user error.
            if (patch.noteRatePercent().compareTo(BigDecimal.ZERO) < 0
                    || patch.noteRatePercent().compareTo(new BigDecimal("99")) > 0) {
                throw new BusinessValidationException("noteRatePercent must be between 0 and 99");
            }
            terms.setNoteRatePercent(patch.noteRatePercent());
        }
        if (patch.amortizationType() != null) terms.setAmortizationType(patch.amortizationType().trim());
        if (patch.amortizationTermMonths() != null) terms.setAmortizationTermMonths(patch.amortizationTermMonths());
        if (patch.lienPriorityType() != null) terms.setLienPriorityType(patch.lienPriorityType().trim());
        if (patch.applicationReceivedDate() != null) terms.setApplicationReceivedDate(patch.applicationReceivedDate());
        if (patch.downPaymentAmount() != null) terms.setDownPaymentAmount(patch.downPaymentAmount());

        loanTermsRepository.save(terms);
        return termsView(terms);
    }

    public record TermsPatch(
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

    @Transactional
    public Map<String, Object> createCondition(Long loanId, ConditionInput input) {
        if (!loanApplicationRepository.existsById(loanId)) {
            throw new ResourceNotFoundException("Loan " + loanId + " not found");
        }
        if (input.conditionText() == null || input.conditionText().isBlank()) {
            throw new BusinessValidationException("conditionText is required");
        }
        Long uid = currentUserService.currentUser().map(u -> (long) u.getId()).orElse(null);

        LoanCondition c = LoanCondition.builder()
                .applicationId(loanId)
                .conditionText(input.conditionText().trim())
                .conditionType(input.conditionType())
                .status(input.status() != null ? input.status() : "Outstanding")
                .assignedToUserId(input.assignedToUserId())
                .dueDate(input.dueDate())
                .notes(input.notes())
                .createdByUserId(uid)
                .build();
        loanConditionRepository.save(c);
        return conditionView(c);
    }

    @Transactional
    public Map<String, Object> updateCondition(Long loanId, Long conditionId, ConditionInput input) {
        LoanCondition c = loanConditionRepository.findById(conditionId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition " + conditionId + " not found"));
        if (!c.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Condition belongs to a different loan");
        }

        if (input.conditionText() != null) c.setConditionText(input.conditionText().trim());
        if (input.conditionType() != null) c.setConditionType(input.conditionType());
        if (input.assignedToUserId() != null) c.setAssignedToUserId(input.assignedToUserId());
        if (input.dueDate() != null) c.setDueDate(input.dueDate());
        if (input.notes() != null) c.setNotes(input.notes());
        if (input.status() != null) {
            String old = c.getStatus();
            c.setStatus(input.status());
            // Stamp clearing details on the Cleared/Waived transition (idempotent).
            boolean transitioningToCleared =
                    !"Outstanding".equals(input.status()) && "Outstanding".equals(old);
            if (transitioningToCleared) {
                c.setClearedAt(LocalDateTime.now());
                c.setClearedByUserId(currentUserService.currentUser().map(u -> (long) u.getId()).orElse(null));
            } else if ("Outstanding".equals(input.status())) {
                // Reopening a cleared condition wipes the clear-stamp so the audit doesn't lie.
                c.setClearedAt(null);
                c.setClearedByUserId(null);
            }
        }
        loanConditionRepository.save(c);
        return conditionView(c);
    }

    @Transactional
    public void deleteCondition(Long loanId, Long conditionId) {
        LoanCondition c = loanConditionRepository.findById(conditionId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition " + conditionId + " not found"));
        if (!c.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Condition belongs to a different loan");
        }
        loanConditionRepository.delete(c);
    }

    public record ConditionInput(
            String conditionText,
            String conditionType,
            String status,
            Long assignedToUserId,
            LocalDate dueDate,
            String notes
    ) {}

    // ─── Notes ─────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getNotes(Long loanId) {
        return loanNoteRepository.findByApplicationIdOrderByCreatedAtDesc(loanId)
                .stream().map(LoanDashboardService::noteView).toList();
    }

    @Transactional
    public Map<String, Object> createNote(Long loanId, String content) {
        if (content == null || content.isBlank()) {
            throw new BusinessValidationException("Note content is required");
        }
        User author = currentUserService.currentUser().orElse(null);
        LoanNote note = LoanNote.builder()
                .applicationId(loanId)
                .authorId(author != null ? (long) author.getId() : null)
                .authorName(author != null
                        ? (author.getName() != null ? author.getName() : author.getEmail())
                        : null)
                .content(content.trim())
                .build();
        loanNoteRepository.save(note);
        return noteView(note);
    }

    @Transactional
    public void deleteNote(Long loanId, Long noteId) {
        LoanNote note = loanNoteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note " + noteId + " not found"));
        if (!note.getApplicationId().equals(loanId)) {
            throw new BusinessValidationException("Note belongs to a different loan");
        }
        loanNoteRepository.delete(note);
    }

    // ─── View shaping helpers ───────────────────────────────────────────────

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

    private static Map<String, Object> noteView(LoanNote n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("authorId", n.getAuthorId());
        m.put("authorName", n.getAuthorName());
        m.put("content", n.getContent());
        m.put("createdAt", n.getCreatedAt());
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
