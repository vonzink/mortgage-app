package com.msfg.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A document attached to a loan application. Storage is S3 — {@link #filePath} holds the
 * full S3 object key. The borrower-portal upload flow:
 * <ol>
 *   <li>Frontend asks for a presigned PUT URL → we create a Document row with
 *       {@code upload_status='pending'} and a fresh {@link #docUuid}.</li>
 *   <li>Frontend uploads directly to S3 using the presigned URL.</li>
 *   <li>Frontend calls {@code PUT /confirm} → we flip status to {@code 'uploaded'},
 *       fill in {@link #fileSize}, and apply tags via {@code PutObjectTagging}.</li>
 * </ol>
 */
@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private LoanApplication application;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "document_type_id")
    private Long documentTypeId;

    @Column(name = "file_name")
    private String fileName;

    /** Sanitized filename — what we use in the S3 key after stripping unsafe chars. */
    @Column(name = "safe_filename")
    private String safeFilename;

    /** Per-document UUID; embedded in the S3 key for non-enumerable URLs. */
    @Column(name = "doc_uuid", unique = true)
    private String docUuid;

    /** Full S3 object key. (Column name kept as {@code file_path} for backward compat.) */
    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type")
    private String contentType;

    /**
     * pending → uploaded → (deleted | failed). Set to 'pending' when the upload URL is issued;
     * flipped to 'uploaded' on /confirm.
     */
    @Column(name = "upload_status", nullable = false)
    @Builder.Default
    private String uploadStatus = "pending";

    /** borrower | agent | lo | system — matches the S3 key segment. */
    @Column(name = "party_role")
    private String partyRole;

    /** Mirrors party_role; populated by V4 migration ahead of party_role. */
    @Column(name = "added_by_role")
    private String addedByRole;

    @Column(name = "uploaded_by_user_id")
    private Integer uploadedByUserId;

    @Column(name = "visible_to_borrower", nullable = false)
    @Builder.Default
    private Boolean visibleToBorrower = true;

    @Column(name = "visible_to_agent", nullable = false)
    @Builder.Default
    private Boolean visibleToAgent = false;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    /**
     * Folder this document lives in within the loan's workspace tree.
     * Null = at the workspace root (legacy borrower uploads pre-Phase 1, or LO chose root).
     */
    @Column(name = "folder_id")
    private Long folderId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "document_status", nullable = false, length = 30)
    @Builder.Default
    private String documentStatus = "PENDING_UPLOAD";

    @Column(name = "reviewed_by_user_id")
    private Integer reviewedByUserId;

    @Column(name = "reviewer_notes", length = 2000)
    private String reviewerNotes;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (uploadedAt == null) uploadedAt = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
