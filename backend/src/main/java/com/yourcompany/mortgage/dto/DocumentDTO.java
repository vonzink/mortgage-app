package com.yourcompany.mortgage.dto;

import java.time.LocalDateTime;

/**
 * Public-facing document representation. Note: never includes s3Key — that's an
 * implementation detail. The frontend uses {@code docUuid} as the document handle.
 */
public class DocumentDTO {

    private Long id;
    private Long applicationId;
    private String docUuid;
    private String documentType;
    private String originalFilename;
    private String safeFilename;
    private String displayName;
    private String contentType;
    private Long fileSize;
    private String uploadStatus;
    private String partyRole;
    private String uploadedByRole;
    private Long uploadedByUserId;
    private Boolean visibleToBorrower;
    private Boolean visibleToAgent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public DocumentDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getApplicationId() { return applicationId; }
    public void setApplicationId(Long applicationId) { this.applicationId = applicationId; }

    public String getDocUuid() { return docUuid; }
    public void setDocUuid(String docUuid) { this.docUuid = docUuid; }

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
}
