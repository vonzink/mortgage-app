package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "loan_applications")
public class LoanApplication {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "application_number", unique = true, nullable = false)
    private String applicationNumber;
    
    @Column(name = "loan_purpose")
    private String loanPurpose;
    
    @Column(name = "loan_type")
    private String loanType;
    
    @Column(name = "loan_amount")
    private BigDecimal loanAmount;
    
    @Column(name = "property_value")
    private BigDecimal propertyValue;
    
    @Column(name = "status")
    private String status = "DRAFT";
    
    @Column(name = "created_date")
    private LocalDateTime createdDate;
    
    @Column(name = "updated_date")
    private LocalDateTime updatedDate;
    
    @Column(name = "ghl_contact_id")
    private String ghlContactId;
    
    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL)
    private Property property;
    
    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Borrower> borrowers = new ArrayList<>();
    
    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Liability> liabilities = new ArrayList<>();
    
    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Document> documents = new ArrayList<>();
    
    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        updatedDate = LocalDateTime.now();
        if (applicationNumber == null) {
            applicationNumber = generateApplicationNumber();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }
    
    private String generateApplicationNumber() {
        return "APP" + System.currentTimeMillis();
    }
    
    // Constructors
    public LoanApplication() {}
    
    public LoanApplication(String loanPurpose, String loanType, BigDecimal loanAmount, BigDecimal propertyValue) {
        this.loanPurpose = loanPurpose;
        this.loanType = loanType;
        this.loanAmount = loanAmount;
        this.propertyValue = propertyValue;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getApplicationNumber() {
        return applicationNumber;
    }
    
    public void setApplicationNumber(String applicationNumber) {
        this.applicationNumber = applicationNumber;
    }
    
    public String getLoanPurpose() {
        return loanPurpose;
    }
    
    public void setLoanPurpose(String loanPurpose) {
        this.loanPurpose = loanPurpose;
    }
    
    public String getLoanType() {
        return loanType;
    }
    
    public void setLoanType(String loanType) {
        this.loanType = loanType;
    }
    
    public BigDecimal getLoanAmount() {
        return loanAmount;
    }
    
    public void setLoanAmount(BigDecimal loanAmount) {
        this.loanAmount = loanAmount;
    }
    
    public BigDecimal getPropertyValue() {
        return propertyValue;
    }
    
    public void setPropertyValue(BigDecimal propertyValue) {
        this.propertyValue = propertyValue;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public LocalDateTime getCreatedDate() {
        return createdDate;
    }
    
    public LocalDateTime getUpdatedDate() {
        return updatedDate;
    }
    
    public String getGhlContactId() {
        return ghlContactId;
    }
    
    public void setGhlContactId(String ghlContactId) {
        this.ghlContactId = ghlContactId;
    }
    
    public Property getProperty() {
        return property;
    }
    
    public void setProperty(Property property) {
        this.property = property;
    }
    
    public List<Borrower> getBorrowers() {
        return borrowers;
    }
    
    public void setBorrowers(List<Borrower> borrowers) {
        this.borrowers = borrowers;
    }
    
    public List<Liability> getLiabilities() {
        return liabilities;
    }
    
    public void setLiabilities(List<Liability> liabilities) {
        this.liabilities = liabilities;
    }
    
    public List<Document> getDocuments() {
        return documents;
    }
    
    public void setDocuments(List<Document> documents) {
        this.documents = documents;
    }
}
