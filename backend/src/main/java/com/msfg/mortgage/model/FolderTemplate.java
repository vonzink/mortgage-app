package com.msfg.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Defines the default subfolder set seeded into each loan's workspace on first access.
 * Editable by Admins — changes affect new loans (and gap-fill on existing loans the
 * next time FolderService.ensureSeeded runs).
 */
@Entity
@Table(name = "folder_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FolderTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_name", nullable = false, unique = true, length = 255)
    private String displayName;

    @Column(name = "sort_key", length = 64)
    private String sortKey;

    @Column(name = "is_old_loan_archive", nullable = false)
    @Builder.Default
    private Boolean isOldLoanArchive = false;

    @Column(name = "is_delete_folder", nullable = false)
    @Builder.Default
    private Boolean isDeleteFolder = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
