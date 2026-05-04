package com.yourcompany.mortgage.security;

import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

/**
 * Per-loan ownership check, used via {@code @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")}.
 *
 * Phase D ruleset:
 * <ul>
 *   <li>Internal staff (Admin, Manager, LO, Processor) → allow.</li>
 *   <li>Borrower → allow only if their Cognito email matches a borrower row on the loan.</li>
 *   <li>Anyone else → deny.</li>
 * </ul>
 *
 * The CLAUDE.md target architecture mentions assigned-LO and agent-on-loan checks;
 * those need {@code loan_agents} / {@code loan_assignments} tables that aren't
 * modeled yet. Today, internal staff have blanket access — tighten when those
 * tables exist.
 */
@Component("loanAccessGuard")
public class LoanAccessGuard {

    private static final Set<String> INTERNAL_ROLES = Set.of("Admin", "Manager", "LO", "Processor");

    private final CurrentUserService currentUserService;
    private final LoanApplicationRepository loanApplicationRepository;

    public LoanAccessGuard(CurrentUserService currentUserService,
                           LoanApplicationRepository loanApplicationRepository) {
        this.currentUserService = currentUserService;
        this.loanApplicationRepository = loanApplicationRepository;
    }

    @Transactional(readOnly = true)
    public boolean canAccess(Long loanId) {
        if (loanId == null) return false;

        Optional<Jwt> jwt = currentUserService.currentJwt();
        if (jwt.isEmpty()) return false;

        Set<String> roles = currentUserService.currentRoles();
        for (String role : INTERNAL_ROLES) {
            if (roles.contains(role)) return true;
        }

        if (!roles.contains("Borrower")) return false;

        String email = jwt.get().getClaimAsString("email");
        if (email == null || email.isBlank()) return false;

        Optional<LoanApplication> loan = loanApplicationRepository.findById(loanId);
        if (loan.isEmpty()) return false;

        for (Borrower b : loan.get().getBorrowers()) {
            if (email.equalsIgnoreCase(b.getEmail())) return true;
        }
        return false;
    }
}
