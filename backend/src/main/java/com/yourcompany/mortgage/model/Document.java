package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
public class Document {

    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_UPLOADED = "uploaded";
    public static final String STATUS_DELETED = "deleted";
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

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "safe_filename")
    private String safeFilename;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "upload_status")
    private String uploadStatus;

    @Column(name = "party_role")
    private String partyRole;

    @Column(name = "added_by_role")
    private String addedByRole;

    @Column(name = "uploaded_by_user_id")
    private Long uploadedByUserId;

    @Column(name = "visible_to_borrower", nullable = false)
    private Boolean visibleToBorrower = Boolean.TRUE;

    @Column(name = "visible_to_agent", nullable = false)
    private Boolean visibleToAgent = Boolean.FALSE;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) uploadedAt = LocalDateTime.now();
        if (uploadStatus == null) uploadStatus = STATUS_PENDING;
        if (partyRole == null) partyRole = "borrower";
        if (visibleToBorrower == null) visibleToBorrower = Boolean.TRUE;
        if (visibleToAgent == null) visibleToAgent = Boolean.FALSE;
    }

    public Document() {}

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

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getSafeFilename() { return safeFilename; }
    public void setSafeFilename(String safeFilename) { this.safeFilename = safeFilename; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getUploadStatus() { return uploadStatus; }
    public void setUploadStatus(String uploadStatus) { this.uploadStatus = uploadStatus; }

    public String getPartyRole() { return partyRole; }
    public void setPartyRole(String partyRole) { this.partyRole = partyRole; }

    public String getAddedByRole() { return addedByRole; }
    public void setAddedByRole(String addedByRole) { this.addedByRole = addedByRole; }

    public Long getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(Long uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

    public Boolean getVisibleToBorrower() { return visibleToBorrower; }
    public void setVisibleToBorrower(Boolean visibleToBorrower) { this.visibleToBorrower = visibleToBorrower; }

    public Boolean getVisibleToAgent() { return visibleToAgent; }
    public void setVisibleToAgent(Boolean visibleToAgent) { this.visibleToAgent = visibleToAgent; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
