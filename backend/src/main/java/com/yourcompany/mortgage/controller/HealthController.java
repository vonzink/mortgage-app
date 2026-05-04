package com.yourcompany.mortgage.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Lightweight liveness probe. Reachable without auth (see {@code SecurityConfig}).
 * Used by deploy/health-check scripts and the dev smoke test.
 */
@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "ok", true,
                "timestamp", Instant.now().toString(),
                "service", "mortgage-app"
        );
    }
}
