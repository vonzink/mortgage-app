package com.yourcompany.mortgage.dto;

import java.time.LocalDateTime;

public class DocumentDTO {

    private Long id;
    private Long applicationId;
    private String docUuid;
    private String documentType;
    private String fileName;
    private String safeFilename;
    private String contentType;
    private Long fileSize;
    private String uploadStatus;
    private String partyRole;
    private String addedByRole;
    private Boolean visibleToBorrower;
    private Boolean visibleToAgent;
    private LocalDateTime uploadedAt;

    public DocumentDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getApplicationId() { return applicationId; }
    public void setApplicationId(Long applicationId) { this.applicationId = applicationId; }

    public String getDocUuid() { return docUuid; }
    public void setDocUuid(String docUuid) { this.docUuid = docUuid; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getSafeFilename() { return safeFilename; }
    public void setSafeFilename(String safeFilename) { this.safeFilename = safeFilename; }

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

    public Boolean getVisibleToBorrower() { return visibleToBorrower; }
    public void setVisibleToBorrower(Boolean visibleToBorrower) { this.visibleToBorrower = visibleToBorrower; }

    public Boolean getVisibleToAgent() { return visibleToAgent; }
    public void setVisibleToAgent(Boolean visibleToAgent) { this.visibleToAgent = visibleToAgent; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
