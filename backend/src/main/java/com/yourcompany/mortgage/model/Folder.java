package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A node in a loan's document workspace tree.
 *
 * <p>Folders live in the database; S3 keys stay flat. Each loan has exactly one root
 * folder ({@code parentId IS NULL}) — see the partial unique index in V11. A folder's
 * full path is computed by walking parent links; not stored.
 *
 * <p>Sibling display names are unique within a parent (case-insensitive, via
 * {@link #nameNormalized}). The 15 default subfolders are flagged {@code isSystem=true}
 * so future "delete folder" UI cannot remove them by mistake.
 */
@Entity
@Table(name = "folders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    /** Null on the loan's root folder. */
    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    /** lower(trim(displayName)); used for case-insensitive sibling-name uniqueness. */
    @Column(name = "name_normalized", nullable = false, length = 255)
    private String nameNormalized;

    /** "01", "02", … for the seeded defaults; NULL for user-created folders. */
    @Column(name = "sort_key", length = 64)
    private String sortKey;

    @Column(name = "is_system", nullable = false)
    private Boolean isSystem;

    @Column(name = "is_old_loan_archive", nullable = false)
    private Boolean isOldLoanArchive;

    /** Each loan has exactly one Delete folder; documents moved into it can be hard-deleted. */
    @Column(name = "is_delete_folder", nullable = false)
    private Boolean isDeleteFolder;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** Soft-delete; never hard-deleted. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (isSystem == null) isSystem = false;
        if (isOldLoanArchive == null) isOldLoanArchive = false;
        if (isDeleteFolder == null) isDeleteFolder = false;
        if (nameNormalized == null && displayName != null) nameNormalized = normalize(displayName);
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (displayName != null) nameNormalized = normalize(displayName);
    }

    public static String normalize(String name) {
        return name == null ? null : name.trim().toLowerCase();
    }
}
