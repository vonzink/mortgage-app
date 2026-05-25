package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingsRepository extends JpaRepository<AppSettings, Integer> {
    /**
     * The row seeded by V25. There's only ever one row.
     * Callers should not assume id=1 in tests — find by min id instead if needed.
     */
    default AppSettings singleton() {
        return findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "app_settings row missing — V25 seed not applied?"));
    }
}
