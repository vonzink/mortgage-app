package com.msfg.mortgage.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

/**
 * LOCAL DEV ONLY (@Profile("local")). Boots mortgage-app without Cognito: every request runs as a
 * fixed dev BORROWER, so the msfg.us -> /loan-applications/intake hand-off and CurrentUserService work
 * offline. NEVER active in dev/prod (those use SecurityConfig + real Cognito JWT).
 */
@Configuration
@Profile("local")
public class LocalSecurityConfig {

    public static final String DEV_BORROWER_SUB = "00000000-0000-0000-0000-0000000000b0";

    @Bean
    SecurityFilterChain localFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(org.springframework.security.config.Customizer.withDefaults())
            .csrf(c -> c.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(reg -> reg.anyRequest().permitAll())
            .addFilterAfter(new DevBorrowerFilter(), SecurityContextHolderFilter.class);
        return http.build();
    }

    static class DevBorrowerFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                throws ServletException, IOException {
            Jwt jwt = Jwt.withTokenValue("local-dev")
                .header("alg", "none")
                .subject(DEV_BORROWER_SUB)
                .claim("email", "borrower@dev.local")
                .claim("cognito:groups", List.of("Borrower"))
                .claim("email_verified", true)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
            var auth = new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_Borrower")));
            SecurityContextHolder.getContext().setAuthentication(auth);
            chain.doFilter(req, res);
        }
    }
}
