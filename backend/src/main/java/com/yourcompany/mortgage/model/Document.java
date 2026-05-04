package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Document metadata. The DB row is the source of truth for user-facing identity
 * (display_name), visibility, ownership, and lifecycle. S3 only stores the bytes.
 *
 * Public handle for frontend / API consumers is {@link #docUuid}, never s3Key.
 */
@Entity
@Table(name = "documents")
public class Document {

    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_UPLOADED = "uploaded";
    public static final String STATUS_FAILED = "failed";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private LoanApplication application;

    @Column(name = "doc_uuid", unique = true)
    private String docUuid;

    @Column(name = "s3_key", length = 1024)
    private String s3Key;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "safe_filename")
    private String safeFilename;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "upload_status")
    private String uploadStatus;

    @Column(name = "party_role")
    private String partyRole;

    @Column(name = "uploaded_by_role")
    private String uploadedByRole;

    @Column(name = "uploaded_by_user_id")
    private Long uploadedByUserId;

    @Column(name = "visible_to_borrower", nullable = false)
    private Boolean visibleToBorrower = Boolean.TRUE;

    @Column(name = "visible_to_agent", nullable = false)
    private Boolean visibleToAgent = Boolean.FALSE;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (uploadStatus == null) uploadStatus = STATUS_PENDING;
        if (partyRole == null) partyRole = "borrower";
        if (visibleToBorrower == null) visibleToBorrower = Boolean.TRUE;
        if (visibleToAgent == null) visibleToAgent = Boolean.FALSE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Document() {}

    public boolean isDeleted() { return deletedAt != null; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LoanApplication getApplication() { return application; }
    public void setApplication(LoanApplication application) { this.application = application; }

    public String getDocUuid() { return docUuid; }
    public void setDocUuid(String docUuid) { this.docUuid = docUuid; }

    public String getS3Key() { return s3Key; }
    public void setS3Key(String s3Key) { this.s3Key = s3Key; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public String getSafeFilename() { return safeFilename; }
    public void setSafeFilename(String safeFilename) { this.safeFilename = safeFilename; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getUploadStatus() { return uploadStatus; }
    public void setUploadStatus(String uploadStatus) { this.uploadStatus = uploadStatus; }

    public String getPartyRole() { return partyRole; }
    public void setPartyRole(String partyRole) { this.partyRole = partyRole; }

    public String getUploadedByRole() { return uploadedByRole; }
    public void setUploadedByRole(String uploadedByRole) { this.uploadedByRole = uploadedByRole; }

    public Long getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(Long uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

    public Boolean getVisibleToBorrower() { return visibleToBorrower; }
    public void setVisibleToBorrower(Boolean visibleToBorrower) { this.visibleToBorrower = visibleToBorrower; }

    public Boolean getVisibleToAgent() { return visibleToAgent; }
    public void setVisibleToAgent(Boolean visibleToAgent) { this.visibleToAgent = visibleToAgent; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
