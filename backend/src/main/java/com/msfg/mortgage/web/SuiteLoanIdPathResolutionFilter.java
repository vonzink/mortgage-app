package com.msfg.mortgage.web;

import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Accepts msfg-suite loan UUIDs anywhere a numeric legacy id is expected in
 * {@code /loan-applications/{id}/**} URLs, by rewriting the id segment to the linked legacy id
 * ({@code loan_applications.suite_loan_id}, populated by the intake hand-off +
 * {@code SuiteReconciliationJob}).
 *
 * <p>Why: the suite is the system of record and its UIs navigate by suite UUID (e.g. the console's
 * "Open in borrower app" links land on /applications/{suiteUuid}); every {@code @PathVariable Long}
 * route then blew up as 500 "An unexpected error occurred". With the rewrite, controllers and the
 * {@code @PreAuthorize} loanAccessGuard checks keep seeing the numeric id they were built for.
 *
 * <p>Runs AFTER the Spring Security chain (lowest precedence), so URL-level rules — which use
 * single-segment wildcards and match UUID and numeric ids alike — evaluate the original path, and
 * unauthenticated callers are rejected before any lookup here. An unknown UUID is a clean 404 in
 * the same JSON shape the frontend already handles.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
@RequiredArgsConstructor
@Slf4j
public class SuiteLoanIdPathResolutionFilter extends OncePerRequestFilter {

    private static final String PREFIX = "/loan-applications/";
    private static final Pattern UUID_SEGMENT = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private final LoanApplicationRepository loanApplicationRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String contextPath = request.getContextPath();
        String path = request.getRequestURI().substring(contextPath.length());
        if (!path.startsWith(PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        String rest = path.substring(PREFIX.length());
        int slash = rest.indexOf('/');
        String idSegment = slash < 0 ? rest : rest.substring(0, slash);
        if (!UUID_SEGMENT.matcher(idSegment).matches()) {
            chain.doFilter(request, response);
            return;
        }

        Optional<LoanApplication> linked =
                loanApplicationRepository.findFirstBySuiteLoanIdOrderByIdAsc(idSegment);
        if (linked.isEmpty()) {
            log.info("No legacy loan linked to suite loan {} — 404 for {}", idSegment, path);
            writeNotFound(response, contextPath + path, idSegment);
            return;
        }

        String rewritten = PREFIX + linked.get().getId() + (slash < 0 ? "" : rest.substring(slash));
        log.debug("Resolved suite loan {} → legacy path {}", idSegment, rewritten);
        chain.doFilter(new RewrittenPathRequest(request, contextPath, rewritten), response);
    }

    /** Same field shape as the Spring default / GlobalExceptionHandler bodies the FE parses. */
    private static void writeNotFound(HttpServletResponse response, String uri, String suiteId)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        // suiteId is UUID-regex-validated and uri is a servlet path — no JSON-escaping concerns.
        response.getWriter().write("{\"timestamp\":\"" + LocalDateTime.now()
                + "\",\"status\":404,\"error\":\"Not Found\",\"message\":"
                + "\"No loan application is linked to suite loan " + suiteId
                + "\",\"path\":\"" + uri + "\"}");
    }

    private static final class RewrittenPathRequest extends HttpServletRequestWrapper {
        private final String contextPath;
        private final String servletPath;

        RewrittenPathRequest(HttpServletRequest request, String contextPath, String servletPath) {
            super(request);
            this.contextPath = contextPath;
            this.servletPath = servletPath;
        }

        @Override
        public String getRequestURI() {
            return contextPath + servletPath;
        }

        @Override
        public String getServletPath() {
            return servletPath;
        }
    }
}
