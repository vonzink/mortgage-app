package com.yourcompany.mortgage.security;

import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.User;
import com.yourcompany.mortgage.repository.BorrowerRepository;
import com.yourcompany.mortgage.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Materializes a local {@link User} row from the JWT on first sign-in, and
 * back-fills {@code borrowers.cognito_sub} when a borrower's Cognito email
 * matches an existing borrower row.
 */
@Service
public class CurrentUserService {

    private static final Logger log = LoggerFactory.getLogger(CurrentUserService.class);

    private final UserRepository userRepository;
    private final BorrowerRepository borrowerRepository;

    public CurrentUserService(UserRepository userRepository, BorrowerRepository borrowerRepository) {
        this.userRepository = userRepository;
        this.borrowerRepository = borrowerRepository;
    }

    /** The authenticated JWT, or empty if the request is anonymous. */
    public Optional<Jwt> currentJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            return Optional.of(jwtAuth.getToken());
        }
        return Optional.empty();
    }

    /** {@code cognito:groups} from the JWT, normalized as a Set (without {@code ROLE_} prefix). */
    public Set<String> currentRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Set.of();
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        java.util.HashSet<String> out = new java.util.HashSet<>();
        for (GrantedAuthority a : authorities) {
            String role = a.getAuthority();
            if (role.startsWith("ROLE_")) out.add(role.substring(5));
        }
        return out;
    }

    public boolean hasAnyRole(String... roles) {
        Set<String> mine = currentRoles();
        for (String r : roles) if (mine.contains(r)) return true;
        return false;
    }

    /**
     * Get-or-create the local User row for the current JWT.
     * Looks up by cognito_sub first, then by email; backfills cognito_sub on the
     * matched user row, and back-fills any borrower rows whose email matches.
     */
    @Transactional
    public Optional<User> currentUser() {
        return currentJwt().map(this::resolveUser);
    }

    private User resolveUser(Jwt jwt) {
        String sub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");

        Optional<User> bySub = userRepository.findByCognitoSub(sub);
        User user = bySub.orElseGet(() -> {
            if (email != null) {
                return userRepository.findByEmail(email).orElseGet(() -> createUser(sub, email));
            }
            return createUser(sub, null);
        });

        boolean dirty = false;
        if (user.getCognitoSub() == null) { user.setCognitoSub(sub); dirty = true; }
        if (user.getEmail() == null && email != null) { user.setEmail(email); dirty = true; }
        user.setLastSignInAt(LocalDateTime.now());
        if (dirty) userRepository.save(user);
        else userRepository.save(user); // updates last_sign_in_at

        if (email != null && sub != null) {
            backfillBorrowers(email, sub);
        }
        return user;
    }

    private User createUser(String sub, String email) {
        User u = new User();
        u.setCognitoSub(sub);
        u.setEmail(email);
        u.setLastSignInAt(LocalDateTime.now());
        return userRepository.save(u);
    }

    private void backfillBorrowers(String email, String sub) {
        try {
            List<Borrower> matches = borrowerRepository.findByEmail(email);
            for (Borrower b : matches) {
                if (b.getCognitoSub() == null) {
                    b.setCognitoSub(sub);
                    borrowerRepository.save(b);
                }
            }
        } catch (RuntimeException e) {
            log.warn("Borrower backfill failed for email {}: {}", email, e.getMessage());
        }
    }
}
