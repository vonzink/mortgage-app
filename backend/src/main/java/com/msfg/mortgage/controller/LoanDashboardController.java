package com.msfg.mortgage.controller;

import com.msfg.mortgage.service.LoanDashboardService;
import com.msfg.mortgage.service.LoanDashboardService.ConditionInput;
import com.msfg.mortgage.service.LoanDashboardService.TermsPatch;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
 *   <li>GET/POST/DELETE /dashboard/notes — free-form notes per loan.</li>
 * </ul>
 *
 * <p>Status changes route through the existing PATCH /loan-applications/{id}/status
 * endpoint (writes loan_status_history). Closing-info edits and agent management
 * intentionally remain read-only here — they have their own controllers.
 *
 * <p>This controller is a thin Spring-binding layer over {@link LoanDashboardService},
 * which owns the query orchestration, validation, and view shaping.
 * Audit item CR-6 brought the controller from 422 lines down to ~80 by moving
 * everything testable into the service.
 */
@RestController
@RequestMapping("/loan-applications/{loanId}/dashboard")
@RequiredArgsConstructor
public class LoanDashboardController {

    private final LoanDashboardService loanDashboardService;

    // ─── Read aggregated dashboard ──────────────────────────────────────────

    @GetMapping
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> getDashboard(@PathVariable Long loanId) {
        return ResponseEntity.ok(loanDashboardService.getDashboard(loanId));
    }

    // ─── Edit loan terms ────────────────────────────────────────────────────

    @PatchMapping("/terms")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> patchTerms(@PathVariable Long loanId, @RequestBody TermsPatch req) {
        return ResponseEntity.ok(loanDashboardService.patchTerms(loanId, req));
    }

    // ─── Conditions CRUD ────────────────────────────────────────────────────

    @PostMapping("/conditions")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> createCondition(@PathVariable Long loanId, @RequestBody ConditionInput req) {
        return ResponseEntity.ok(loanDashboardService.createCondition(loanId, req));
    }

    @PatchMapping("/conditions/{conditionId}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> updateCondition(@PathVariable Long loanId,
                                              @PathVariable Long conditionId,
                                              @RequestBody ConditionInput req) {
        return ResponseEntity.ok(loanDashboardService.updateCondition(loanId, conditionId, req));
    }

    @DeleteMapping("/conditions/{conditionId}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> deleteCondition(@PathVariable Long loanId, @PathVariable Long conditionId) {
        loanDashboardService.deleteCondition(loanId, conditionId);
        return ResponseEntity.noContent().build();
    }

    // ─── Notes ─────────────────────────────────────────────────────────────

    @GetMapping("/notes")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> getNotes(@PathVariable Long loanId) {
        return ResponseEntity.ok(loanDashboardService.getNotes(loanId));
    }

    @PostMapping("/notes")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> createNote(@PathVariable Long loanId, @RequestBody NoteRequest req) {
        return ResponseEntity.ok(loanDashboardService.createNote(loanId, req.content()));
    }

    @DeleteMapping("/notes/{noteId}")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> deleteNote(@PathVariable Long loanId, @PathVariable Long noteId) {
        loanDashboardService.deleteNote(loanId, noteId);
        return ResponseEntity.noContent().build();
    }

    public record NoteRequest(String content) {}
}
