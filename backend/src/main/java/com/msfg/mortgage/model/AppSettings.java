package com.msfg.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Single-row tenant configuration. One row only, id=1. Holds the global
 * AI-eval feature toggle (Q6 — ships OFF) and the default LLM provider/model.
 */
@Entity
@Table(name = "app_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ai_eval_enabled", nullable = false)
    @Builder.Default
    private Boolean aiEvalEnabled = false;

    @Column(name = "llm_default_provider", nullable = false, length = 32)
    @Builder.Default
    private String llmDefaultProvider = "anthropic";

    @Column(name = "llm_default_model", length = 64)
    private String llmDefaultModel;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by_user_id")
    private Integer updatedByUserId;

    @PrePersist @PreUpdate
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
