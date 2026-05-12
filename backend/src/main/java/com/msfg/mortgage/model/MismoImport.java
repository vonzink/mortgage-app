package com.msfg.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Audit row for a single MISMO file import. Append-only — never modified after creation.
 * Backs the audit panel ("On 4/30, Zach imported R008739, 14 fields changed") and the
 * revert workflow (each row points at the original file in S3).
 */
@Entity
@Table(name = "mismo_imports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MismoImport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "loan_application_id", nullable = false)
    private Long loanApplicationId;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @Column(name = "imported_by_user_id")
    private Integer importedByUserId;

    @Column(name = "source_filename", length = 500)
    private String sourceFilename;

    @Column(name = "s3_checkpoint_key", length = 500)
    private String s3CheckpointKey;

    /** From the file's {@code <CreatedDatetime>} — used to compute drift against the DB. */
    @Column(name = "file_created_datetime")
    private LocalDateTime fileCreatedDatetime;

    @Column(name = "fields_changed_count", nullable = false)
    @Builder.Default
    private Integer fieldsChangedCount = 0;

    /** JSON array of {path, before, after} entries. */
    @Column(name = "fields_changed_summary", columnDefinition = "TEXT")
    private String fieldsChangedSummary;

    @Column(name = "forced", nullable = false)
    @Builder.Default
    private Boolean forced = false;

    @PrePersist
    protected void onCreate() {
        if (importedAt == null) importedAt = LocalDateTime.now();
    }
}
