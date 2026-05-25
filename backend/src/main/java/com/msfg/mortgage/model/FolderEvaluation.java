package com.msfg.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One row per evaluate-attempt — including ones that never call the provider.
 * Doubles as audit trail (who clicked, what would have gone to which provider,
 * cost) and as the source the workspace card reads.
 */
@Entity
@Table(name = "folder_evaluations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FolderEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "folder_template_id", nullable = false)
    private Long folderTemplateId;

    @Column(name = "provider", nullable = false, length = 32)
    private String provider;

    @Column(name = "model", length = 64)
    private String model;

    @Column(name = "provider_called", nullable = false)
    private Boolean providerCalled;

    @Column(name = "prompt_snapshot", columnDefinition = "TEXT")
    private String promptSnapshot;

    @Column(name = "document_ids", columnDefinition = "TEXT")
    private String documentIds;

    @Column(name = "response_markdown", columnDefinition = "TEXT")
    private String responseMarkdown;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "estimated_input_tokens")
    private Integer estimatedInputTokens;

    @Column(name = "actual_input_tokens")
    private Integer actualInputTokens;

    @Column(name = "actual_output_tokens")
    private Integer actualOutputTokens;

    @Column(name = "cost_usd", nullable = false, precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal costUsd = BigDecimal.ZERO;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "parser", length = 32)
    private String parser;

    @Column(name = "scanned_likely")
    private Boolean scannedLikely;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_by_user_id")
    private Integer createdByUserId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
