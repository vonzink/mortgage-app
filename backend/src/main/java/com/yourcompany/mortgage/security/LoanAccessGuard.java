package com.yourcompany.mortgage.security;

import com.yourcompany.mortgage.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

/**
 * Per-loan ownership / visibility check. Used from controllers via:
 * <pre>{@code @PreAuthorize("@loanAccessGuard.canAccess(#id)")}</pre>
 *
 * <p>Returns {@code true} when ANY of:
 * <ul>
 *   <li>caller is in {@code Admin} or {@code Manager};
 *   <li>caller is in {@code LO}/{@code Processor} and is the loan's {@code assigned_lo_id};
 *   <li>caller is in {@code Borrower} and there's a {@code borrowers} row with their user_id;
 *   <li>caller is in {@code RealEstateAgent} and there's a {@code loan_agents} row with their user_id.
 * </ul>
 *
 * <p>This is the policy layer; {@link CurrentUserService} is the identity layer.
 */
@Component("loanAccessGuard")
@RequiredArgsConstructor
@Slf4j
public class LoanAccessGuard {

    private static final Set<String> SUPERUSER_GROUPS = Set.of("ROLE_Admin", "ROLE_Manager");
    private static final Set<String> LO_GROUPS = Set.of("ROLE_LO", "ROLE_Processor");

    private final JdbcTemplate jdbc;
    private final CurrentUserService currentUserService;

    public boolean canAccess(long loanApplicationId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;

        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        if (hasAny(authorities, SUPERUSER_GROUPS)) return true;

        Optional<User> meOpt = currentUserService.currentUser();
        if (meOpt.isEmpty()) {
            log.debug("LoanAccessGuard: no resolved user for principal {} — denying", auth.getName());
            return false;
        }
        int userId = meOpt.get().getId();

        if (hasAny(authorities, LO_GROUPS) && isAssignedLo(loanApplicationId, userId)) return true;
        if (hasRole(authorities, "ROLE_Borrower") && isBorrowerOnLoan(loanApplicationId, userId)) return true;
        if (hasRole(authorities, "ROLE_RealEstateAgent") && isAgentOnLoan(loanApplicationId, userId)) return true;

        return false;
    }

    /** True if the caller is internal (LO/Processor/Manager/Admin). Used by `/api/me/loans` filtering. */
    public boolean isInternal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        Collection<? extends GrantedAuthority> a = auth.getAuthorities();
        return hasAny(a, SUPERUSER_GROUPS) || hasAny(a, LO_GROUPS);
    }

    // ─────────────── helpers ───────────────

    private static boolean hasAny(Collection<? extends GrantedAuthority> auths, Set<String> wanted) {
        for (GrantedAuthority a : auths) if (wanted.contains(a.getAuthority())) return true;
        return false;
    }

    private static boolean hasRole(Collection<? extends GrantedAuthority> auths, String role) {
        for (GrantedAuthority a : auths) if (role.equals(a.getAuthority())) return true;
        return false;
    }

    private boolean isAssignedLo(long loanId, int userId) {
        Long match = jdbc.query(
                "SELECT assigned_lo_id FROM loan_applications WHERE id = ?",
                rs -> rs.next() ? rs.getObject("assigned_lo_id", Long.class) : null,
                loanId
        );
        return match != null && match == userId;
    }

    private boolean isBorrowerOnLoan(long loanId, int userId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM borrowers WHERE application_id = ? AND user_id = ?",
                Integer.class, loanId, userId
        );
        return count != null && count > 0;
    }

    private boolean isAgentOnLoan(long loanId, int userId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM loan_agents WHERE loan_application_id = ? AND user_id = ?",
                Integer.class, loanId, userId
        );
        return count != null && count > 0;
    }
}
