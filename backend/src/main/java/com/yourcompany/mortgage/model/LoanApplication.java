package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
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

    /**
     * Stored as VARCHAR(30); see {@link LoanStatus} for valid values.
     * Default is {@code REGISTERED} — the entry point of the 11-stage workflow.
     */
    @Column(name = "status")
    private String status = LoanStatus.REGISTERED.name();

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "updated_date")
    private LocalDateTime updatedDate;

    @Column(name = "ghl_contact_id")
    private String ghlContactId;

    /** Local users.id of the assigned loan officer. Drives LO-side access checks. */
    @Column(name = "assigned_lo_id")
    private Integer assignedLoId;

    /** Cached display name; updated whenever assigned_lo_id changes. Saves a join on list views. */
    @Column(name = "assigned_lo_name")
    private String assignedLoName;

    /** LendingPad's R-number, assigned when the loan first lands in LendingPad. */
    @Column(name = "lendingpad_loan_number")
    private String lendingpadLoanNumber;

    /** Investor's loan number, assigned post-sale. */
    @Column(name = "investor_loan_number")
    private String investorLoanNumber;

    /** MERS Mortgage Identification Number (18 digits). Round-tripped from LendingPad. */
    @Column(name = "mers_min")
    private String mersMin;

    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private Property property;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Borrower> borrowers = new ArrayList<>();

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Liability> liabilities = new ArrayList<>();

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Document> documents = new ArrayList<>();

    /** Singleton closing-stage data; created lazily when the LO fills the Closing & Fees step. */
    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private ClosingInformation closingInformation;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<ClosingFee> closingFees = new ArrayList<>();

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<LoanAgent> loanAgents = new ArrayList<>();

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
        // Generate a 6-digit random number (100000 to 999999)
        int randomNum = 100000 + (int)(Math.random() * 900000);
        return "APP" + randomNum;
    }

    public LoanApplication() {}

    public LoanApplication(String loanPurpose, String loanType, BigDecimal loanAmount, BigDecimal propertyValue) {
        this.loanPurpose = loanPurpose;
        this.loanType = loanType;
        this.loanAmount = loanAmount;
        this.propertyValue = propertyValue;
    }

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

    /** Type-safe accessor; returns null if {@link #status} doesn't map to a known {@link LoanStatus}. */
    public LoanStatus getLoanStatus() {
        return LoanStatus.fromString(status).orElse(null);
    }

    public void setLoanStatus(LoanStatus loanStatus) {
        this.status = loanStatus == null ? null : loanStatus.name();
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

    public Integer getAssignedLoId() {
        return assignedLoId;
    }

    public void setAssignedLoId(Integer assignedLoId) {
        this.assignedLoId = assignedLoId;
    }

    public String getAssignedLoName() {
        return assignedLoName;
    }

    public void setAssignedLoName(String assignedLoName) {
        this.assignedLoName = assignedLoName;
    }

    public String getLendingpadLoanNumber() {
        return lendingpadLoanNumber;
    }

    public void setLendingpadLoanNumber(String lendingpadLoanNumber) {
        this.lendingpadLoanNumber = lendingpadLoanNumber;
    }

    public String getInvestorLoanNumber() {
        return investorLoanNumber;
    }

    public void setInvestorLoanNumber(String investorLoanNumber) {
        this.investorLoanNumber = investorLoanNumber;
    }

    public String getMersMin() {
        return mersMin;
    }

    public void setMersMin(String mersMin) {
        this.mersMin = mersMin;
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

    public ClosingInformation getClosingInformation() {
        return closingInformation;
    }

    public void setClosingInformation(ClosingInformation closingInformation) {
        this.closingInformation = closingInformation;
    }

    public List<ClosingFee> getClosingFees() {
        return closingFees;
    }

    public void setClosingFees(List<ClosingFee> closingFees) {
        this.closingFees = closingFees;
    }

    public List<LoanAgent> getLoanAgents() {
        return loanAgents;
    }

    public void setLoanAgents(List<LoanAgent> loanAgents) {
        this.loanAgents = loanAgents;
    }
}