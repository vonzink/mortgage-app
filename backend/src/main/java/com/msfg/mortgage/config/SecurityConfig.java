package com.msfg.mortgage.config;

import com.msfg.mortgage.security.CognitoJwtConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Cognito-backed JWT resource server config.
 *
 * <p>Auth model: every request must carry a valid Cognito JWT in
 * {@code Authorization: Bearer <token>} (issuer validated via
 * {@code spring.security.oauth2.resourceserver.jwt.issuer-uri}). Cognito groups are mapped to
 * Spring authorities by {@link CognitoJwtConverter} so we can use {@code hasRole("LO")} etc.
 *
 * <p>Path-level rules here are coarse — fine-grained checks (e.g. "this borrower owns this loan")
 * happen via {@code LoanAccessGuard} called from controllers/services.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CognitoJwtConverter cognitoJwtConverter;
    private final List<String> allowedOrigins;

    public SecurityConfig(CognitoJwtConverter cognitoJwtConverter,
                          @Value("${app.cors.allowed-origins:http://localhost:3000}") String allowedOriginsCsv) {
        this.cognitoJwtConverter = cognitoJwtConverter;
        this.allowedOrigins = Arrays.stream(allowedOriginsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(HttpMethod.GET, "/health", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Spring forwards favicon, error, etc. — let them through for proper error pages
                        .requestMatchers("/error").permitAll()

                        // LO-only loan-management endpoints (granular ownership checks live in @PreAuthorize)
                        .requestMatchers(HttpMethod.PATCH, "/loan-applications/*/status").hasAnyRole("LO", "Admin", "Processor")
                        .requestMatchers(HttpMethod.POST, "/loan-applications/*/status/**").hasAnyRole("LO", "Admin", "Processor")
                        .requestMatchers("/loan-applications/*/borrowers/invite").hasAnyRole("LO", "Admin")
                        .requestMatchers("/loan-applications/*/agents/assign").hasAnyRole("LO", "Admin")
                        .requestMatchers("/loan-applications/*/export/**").hasAnyRole("LO", "Admin", "Processor")

                        // Admin-only
                        .requestMatchers("/admin/**").hasRole("Admin")

                        // Reads/writes that are role-gated; per-loan ownership enforced by @PreAuthorize on controllers
                        .requestMatchers("/loan-applications/**", "/me/**", "/documents/**")
                            .hasAnyRole("Borrower", "RealEstateAgent", "LO", "Processor", "Manager", "Admin")

                        // Default: must be authenticated
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(cognitoJwtConverter))
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Active-Role"));
        configuration.setExposedHeaders(List.of("Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
