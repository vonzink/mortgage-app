package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(name = "declarations")
public class Declaration {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    private Borrower borrower;
    
    @Column(name = "outstanding_judgments")
    private Boolean outstandingJudgments = false;
    
    @Column(name = "bankruptcy")
    private Boolean bankruptcy = false;
    
    @Column(name = "foreclosure")
    private Boolean foreclosure = false;
    
    @Column(name = "lawsuit")
    private Boolean lawsuit = false;
    
    @Column(name = "loan_foreclosure")
    private Boolean loanForeclosure = false;
    
    @Column(name = "presently_delinquent")
    private Boolean presentlyDelinquent = false;
    
    @Column(name = "alimony_child_support")
    private Boolean alimonyChildSupport = false;
    
    @Column(name = "borrowing_down_payment")
    private Boolean borrowingDownPayment = false;
    
    @Column(name = "comaker_endorser")
    private Boolean comakerEndorser = false;
    
    @Column(name = "us_citizen")
    private Boolean usCitizen = true;
    
    @Column(name = "permanent_resident")
    private Boolean permanentResident = false;
    
    @Column(name = "intent_to_occupy")
    private Boolean intentToOccupy = true;
    
    // Additional mortgage declaration questions
    @Column(name = "down_payment_gift")
    private Boolean downPaymentGift = false;
    
    @Column(name = "gift_source")
    private String giftSource;
    
    @Column(name = "gift_amount")
    private java.math.BigDecimal giftAmount;
    
    @Column(name = "co_signer_obligation")
    private Boolean coSignerObligation = false;
    
    @Column(name = "pending_credit_inquiry")
    private Boolean pendingCreditInquiry = false;
    
    @Column(name = "credit_explanation")
    private String creditExplanation;
    
    @Column(name = "employment_gap_explanation")
    private String employmentGapExplanation;
    
    @Column(name = "income_verification_consent")
    private Boolean incomeVerificationConsent = true;
    
    @Column(name = "credit_report_consent")
    private Boolean creditReportConsent = true;
    
    @Column(name = "property_insurance_required")
    private Boolean propertyInsuranceRequired = true;
    
    @Column(name = "flood_insurance_required")
    private Boolean floodInsuranceRequired = false;
    
    // Constructors
    public Declaration() {}
    
    public Declaration(Borrower borrower) {
        this.borrower = borrower;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Borrower getBorrower() {
        return borrower;
    }
    
    public void setBorrower(Borrower borrower) {
        this.borrower = borrower;
    }
    
    public Boolean getOutstandingJudgments() {
        return outstandingJudgments;
    }
    
    public void setOutstandingJudgments(Boolean outstandingJudgments) {
        this.outstandingJudgments = outstandingJudgments;
    }
    
    public Boolean getBankruptcy() {
        return bankruptcy;
    }
    
    public void setBankruptcy(Boolean bankruptcy) {
        this.bankruptcy = bankruptcy;
    }
    
    public Boolean getForeclosure() {
        return foreclosure;
    }
    
    public void setForeclosure(Boolean foreclosure) {
        this.foreclosure = foreclosure;
    }
    
    public Boolean getLawsuit() {
        return lawsuit;
    }
    
    public void setLawsuit(Boolean lawsuit) {
        this.lawsuit = lawsuit;
    }
    
    public Boolean getLoanForeclosure() {
        return loanForeclosure;
    }
    
    public void setLoanForeclosure(Boolean loanForeclosure) {
        this.loanForeclosure = loanForeclosure;
    }
    
    public Boolean getPresentlyDelinquent() {
        return presentlyDelinquent;
    }
    
    public void setPresentlyDelinquent(Boolean presentlyDelinquent) {
        this.presentlyDelinquent = presentlyDelinquent;
    }
    
    public Boolean getAlimonyChildSupport() {
        return alimonyChildSupport;
    }
    
    public void setAlimonyChildSupport(Boolean alimonyChildSupport) {
        this.alimonyChildSupport = alimonyChildSupport;
    }
    
    public Boolean getBorrowingDownPayment() {
        return borrowingDownPayment;
    }
    
    public void setBorrowingDownPayment(Boolean borrowingDownPayment) {
        this.borrowingDownPayment = borrowingDownPayment;
    }
    
    public Boolean getComakerEndorser() {
        return comakerEndorser;
    }
    
    public void setComakerEndorser(Boolean comakerEndorser) {
        this.comakerEndorser = comakerEndorser;
    }
    
    public Boolean getUsCitizen() {
        return usCitizen;
    }
    
    public void setUsCitizen(Boolean usCitizen) {
        this.usCitizen = usCitizen;
    }
    
    public Boolean getPermanentResident() {
        return permanentResident;
    }
    
    public void setPermanentResident(Boolean permanentResident) {
        this.permanentResident = permanentResident;
    }
    
    public Boolean getIntentToOccupy() {
        return intentToOccupy;
    }
    
    public void setIntentToOccupy(Boolean intentToOccupy) {
        this.intentToOccupy = intentToOccupy;
    }
    
    public Boolean getDownPaymentGift() {
        return downPaymentGift;
    }
    
    public void setDownPaymentGift(Boolean downPaymentGift) {
        this.downPaymentGift = downPaymentGift;
    }
    
    public String getGiftSource() {
        return giftSource;
    }
    
    public void setGiftSource(String giftSource) {
        this.giftSource = giftSource;
    }
    
    public java.math.BigDecimal getGiftAmount() {
        return giftAmount;
    }
    
    public void setGiftAmount(java.math.BigDecimal giftAmount) {
        this.giftAmount = giftAmount;
    }
    
    public Boolean getCoSignerObligation() {
        return coSignerObligation;
    }
    
    public void setCoSignerObligation(Boolean coSignerObligation) {
        this.coSignerObligation = coSignerObligation;
    }
    
    public Boolean getPendingCreditInquiry() {
        return pendingCreditInquiry;
    }
    
    public void setPendingCreditInquiry(Boolean pendingCreditInquiry) {
        this.pendingCreditInquiry = pendingCreditInquiry;
    }
    
    public String getCreditExplanation() {
        return creditExplanation;
    }
    
    public void setCreditExplanation(String creditExplanation) {
        this.creditExplanation = creditExplanation;
    }
    
    public String getEmploymentGapExplanation() {
        return employmentGapExplanation;
    }
    
    public void setEmploymentGapExplanation(String employmentGapExplanation) {
        this.employmentGapExplanation = employmentGapExplanation;
    }
    
    public Boolean getIncomeVerificationConsent() {
        return incomeVerificationConsent;
    }
    
    public void setIncomeVerificationConsent(Boolean incomeVerificationConsent) {
        this.incomeVerificationConsent = incomeVerificationConsent;
    }
    
    public Boolean getCreditReportConsent() {
        return creditReportConsent;
    }
    
    public void setCreditReportConsent(Boolean creditReportConsent) {
        this.creditReportConsent = creditReportConsent;
    }
    
    public Boolean getPropertyInsuranceRequired() {
        return propertyInsuranceRequired;
    }
    
    public void setPropertyInsuranceRequired(Boolean propertyInsuranceRequired) {
        this.propertyInsuranceRequired = propertyInsuranceRequired;
    }
    
    public Boolean getFloodInsuranceRequired() {
        return floodInsuranceRequired;
    }
    
    public void setFloodInsuranceRequired(Boolean floodInsuranceRequired) {
        this.floodInsuranceRequired = floodInsuranceRequired;
    }
}
