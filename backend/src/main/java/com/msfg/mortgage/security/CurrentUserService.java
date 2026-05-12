package com.msfg.mortgage.security;

import com.msfg.mortgage.model.User;
import com.msfg.mortgage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Resolves the calling user (from the Cognito JWT on the SecurityContext) into a local
 * {@link User} record, materializing the row on first sign-in.
 *
 * <p>The dashboard does the same thing in {@code backend/middleware/userContext.js}: lookup
 * by email first, fall back to {@code cognito_sub}, and create a row keyed by both if neither
 * exists. We keep the role aligned with the most specific Cognito group present in the JWT.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CurrentUserService {

    /** Cognito groups in priority order — most specific first. The "primary" group becomes the user.role. */
    private static final List<String> GROUP_PRIORITY = List.of(
            "Admin", "Manager", "Processor", "LO", "RealEstateAgent", "Borrower", "External"
    );

    private final UserRepository userRepository;

    /**
     * Look up (or create) the local user for the current request. Returns empty when there
     * is no authenticated principal — callers should treat that as 401.
     */
    @Transactional
    public Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth) || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        return Optional.of(resolveOrCreate(jwtAuth.getToken()));
    }

    /**
     * Look up by email then sub; create the row on first sign-in. Idempotent — repeated calls
     * with the same JWT return the same user. Updates name/role if Cognito changed them.
     */
    @Transactional
    public User resolveOrCreate(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        String sub = jwt.getSubject();

        // Cognito access tokens omit `email`; only id tokens carry it. The frontend now sends
        // id tokens, but be defensive: synthesize a placeholder email from the sub or username
        // if it's still missing — the column is NOT NULL, and we'd rather have a row than 500.
        if (email == null || email.isBlank()) {
            String username = jwt.getClaimAsString("cognito:username");
            email = (username != null && !username.isBlank())
                    ? username + "@unknown.cognito"
                    : sub + "@unknown.cognito";
            log.warn("JWT had no email claim — using synthetic '{}'. Frontend may be sending access_token instead of id_token.", email);
        }

        String name = jwt.getClaimAsString("name");
        if (name == null || name.isBlank()) {
            String given = jwt.getClaimAsString("given_name");
            String family = jwt.getClaimAsString("family_name");
            name = String.join(" ",
                    given == null ? "" : given,
                    family == null ? "" : family).trim();
            if (name.isBlank()) name = email; // last-resort fallback
        }
        String primaryGroup = primaryGroup(jwt.getClaimAsStringList("cognito:groups"));
        String role = primaryGroup == null ? "borrower" : primaryGroup.toLowerCase();

        // Prefer email match (stable across Cognito refreshes), then sub
        Optional<User> existing = (email == null || email.isBlank())
                ? Optional.empty()
                : userRepository.findByEmail(email);
        if (existing.isEmpty() && sub != null) {
            existing = userRepository.findByCognitoSub(sub);
        }

        if (existing.isPresent()) {
            User u = existing.get();
            // Backfill / refresh non-identifying fields
            boolean dirty = false;
            if (u.getCognitoSub() == null && sub != null) { u.setCognitoSub(sub); dirty = true; }
            if (name != null && !name.equals(u.getName())) { u.setName(name); dirty = true; }
            if (primaryGroup != null && !primaryGroup.equals(u.getCognitoGroup())) {
                u.setCognitoGroup(primaryGroup);
                u.setRole(role);
                dirty = true;
            }
            return dirty ? userRepository.save(u) : u;
        }

        log.info("Materializing new user row for Cognito sub={} email={} group={}", sub, email, primaryGroup);
        return userRepository.save(User.builder()
                .email(email)
                .name(name)
                .initials(initialsOf(name))
                .role(role)
                .cognitoSub(sub)
                .cognitoGroup(primaryGroup)
                .build());
    }

    private static String primaryGroup(List<String> groups) {
        if (groups == null || groups.isEmpty()) return null;
        for (String preferred : GROUP_PRIORITY) {
            if (groups.contains(preferred)) return preferred;
        }
        return groups.get(0);
    }

    private static String initialsOf(String name) {
        if (name == null || name.isBlank()) return "";
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) sb.append(Character.toUpperCase(p.charAt(0)));
            if (sb.length() >= 3) break;
        }
        return sb.toString();
    }
}
