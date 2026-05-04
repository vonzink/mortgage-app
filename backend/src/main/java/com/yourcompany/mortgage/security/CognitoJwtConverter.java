package com.yourcompany.mortgage.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Converts an incoming Cognito JWT into a Spring {@link JwtAuthenticationToken}, mapping the
 * {@code cognito:groups} claim to {@code ROLE_*} authorities so we can use
 * {@code @PreAuthorize("hasRole('LO')")} or HTTP request matchers like
 * {@code .hasRole("Borrower")} elsewhere in the app.
 *
 * <p>Cognito groups in this pool: Admin, Manager, LO, Processor, External, Borrower, RealEstateAgent.
 *
 * <p>The principal name is set to the user's email (preferred) or {@code sub} as a fallback,
 * matching the lookup pattern used by dashboard.msfgco.com (see backend/middleware/userContext.js).
 */
@Component
public class CognitoJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final String GROUPS_CLAIM = "cognito:groups";
    private static final String EMAIL_CLAIM = "email";

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        String principalName = jwt.getClaimAsString(EMAIL_CLAIM);
        if (principalName == null || principalName.isBlank()) {
            principalName = jwt.getSubject();
        }
        return new JwtAuthenticationToken(jwt, authorities, principalName);
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        Object raw = jwt.getClaim(GROUPS_CLAIM);
        if (raw instanceof List<?> groups) {
            for (Object g : groups) {
                if (g != null) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + g));
                }
            }
        }
        return authorities;
    }
}
