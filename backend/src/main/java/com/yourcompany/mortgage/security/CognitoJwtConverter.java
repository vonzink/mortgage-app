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
 * Maps the {@code cognito:groups} claim to Spring {@code ROLE_*} authorities.
 * Cognito groups in our user pool: Admin, Manager, LO, Processor, External,
 * Borrower, RealEstateAgent.
 *
 * Principal name is the {@code email} claim if present (id_token always carries it),
 * falling back to {@code sub} (always present in any token).
 */
@Component
public class CognitoJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        Object groups = jwt.getClaim("cognito:groups");
        if (groups instanceof List<?> list) {
            for (Object g : list) {
                if (g != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + g));
            }
        }

        String name = jwt.getClaimAsString("email");
        if (name == null || name.isBlank()) name = jwt.getSubject();
        return new JwtAuthenticationToken(jwt, authorities, name);
    }
}
