package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.NotNull;

public class DeclarationDTO {
    
    private Long id;
    
    @NotNull(message = "Outstanding judgments declaration is required")
    private Boolean outstandingJudgments = false;
    
    @NotNull(message = "Bankruptcy declaration is required")
    private Boolean bankruptcy = false;
    
    @NotNull(message = "Foreclosure declaration is required")
    private Boolean foreclosure = false;
    
    @NotNull(message = "Lawsuit declaration is required")
    private Boolean lawsuit = false;
    
    @NotNull(message = "Loan foreclosure declaration is required")
    private Boolean loanForeclosure = false;
    
    @NotNull(message = "Presently delinquent declaration is required")
    private Boolean presentlyDelinquent = false;
    
    @NotNull(message = "Alimony/child support declaration is required")
    private Boolean alimonyChildSupport = false;
    
    @NotNull(message = "Borrowing down payment declaration is required")
    private Boolean borrowingDownPayment = false;
    
    @NotNull(message = "Comaker/endorser declaration is required")
    private Boolean comakerEndorser = false;
    
    @NotNull(message = "US citizen declaration is required")
    private Boolean usCitizen = true;
    
    @NotNull(message = "Permanent resident declaration is required")
    private Boolean permanentResident = false;
    
    @NotNull(message = "Intent to occupy declaration is required")
    private Boolean intentToOccupy = true;
    
    // Additional mortgage declaration questions
    private Boolean downPaymentGift = false;
    private String giftSource;
    private java.math.BigDecimal giftAmount;
    private Boolean coSignerObligation = false;
    private Boolean pendingCreditInquiry = false;
    private String creditExplanation;
    private String employmentGapExplanation;
    private Boolean incomeVerificationConsent = true;
    private Boolean creditReportConsent = true;
    private Boolean propertyInsuranceRequired = true;
    private Boolean floodInsuranceRequired = false;
    
    private Long borrowerId; // For association
    
    // Read-only computed fields
    private Boolean hasAdverseDeclarations;
    private Boolean hasLegalIssues;
    private Boolean hasFinancialIssues;
    private Integer riskScore;
    
    // Constructors
    public DeclarationDTO() {
        computeDerivedFields();
    }
    
    // Business logic methods
    public void computeDerivedFields() {
        this.hasLegalIssues = (outstandingJudgments != null && outstandingJudgments) ||
                             (lawsuit != null && lawsuit) ||
                             (bankruptcy != null && bankruptcy);
                             
        this.hasFinancialIssues = (foreclosure != null && foreclosure) ||
                                 (loanForeclosure != null && loanForeclosure) ||
                                 (presentlyDelinquent != null && presentlyDelinquent) ||
                                 (alimonyChildSupport != null && alimonyChildSupport);
                                 
        this.hasAdverseDeclarations = hasLegalIssues || hasFinancialIssues ||
                                     (borrowingDownPayment != null && borrowingDownPayment) ||
                                     (comakerEndorser != null && comakerEndorser);
                                     
        // Calculate risk score (0-100, lower is better)
        this.riskScore = calculateRiskScore();
    }
    
    private Integer calculateRiskScore() {
        int score = 0;
        
        if (Boolean.TRUE.equals(bankruptcy)) score += 25;
        if (Boolean.TRUE.equals(foreclosure)) score += 20;
        if (Boolean.TRUE.equals(loanForeclosure)) score += 20;
        if (Boolean.TRUE.equals(outstandingJudgments)) score += 15;
        if (Boolean.TRUE.equals(lawsuit)) score += 10;
        if (Boolean.TRUE.equals(presentlyDelinquent)) score += 15;
        if (Boolean.TRUE.equals(alimonyChildSupport)) score += 5;
        if (Boolean.TRUE.equals(borrowingDownPayment)) score += 10;
        if (Boolean.TRUE.equals(comakerEndorser)) score += 5;
        
        // Citizenship status adjustments
        if (Boolean.FALSE.equals(usCitizen) && Boolean.FALSE.equals(permanentResident)) {
            score += 10;
        }
        
        if (Boolean.FALSE.equals(intentToOccupy)) score += 5;
        
        return Math.min(score, 100); // Cap at 100
    }
    
    public boolean isEligibleForLoan() {
        return riskScore != null && riskScore < 50; // Business rule threshold
    }
    
    public String getRiskLevel() {
        if (riskScore == null) return "Unknown";
        if (riskScore <= 20) return "Low";
        if (riskScore <= 50) return "Medium";
        if (riskScore <= 75) return "High";
        return "Very High";
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Boolean getOutstandingJudgments() {
        return outstandingJudgments;
    }
    
    public void setOutstandingJudgments(Boolean outstandingJudgments) {
        this.outstandingJudgments = outstandingJudgments;
        computeDerivedFields();
    }
    
    public Boolean getBankruptcy() {
        return bankruptcy;
    }
    
    public void setBankruptcy(Boolean bankruptcy) {
        this.bankruptcy = bankruptcy;
        computeDerivedFields();
    }
    
    public Boolean getForeclosure() {
        return foreclosure;
    }
    
    public void setForeclosure(Boolean foreclosure) {
        this.foreclosure = foreclosure;
        computeDerivedFields();
    }
    
    public Boolean getLawsuit() {
        return lawsuit;
    }
    
    public void setLawsuit(Boolean lawsuit) {
        this.lawsuit = lawsuit;
        computeDerivedFields();
    }
    
    public Boolean getLoanForeclosure() {
        return loanForeclosure;
    }
    
    public void setLoanForeclosure(Boolean loanForeclosure) {
        this.loanForeclosure = loanForeclosure;
        computeDerivedFields();
    }
    
    public Boolean getPresentlyDelinquent() {
        return presentlyDelinquent;
    }
    
    public void setPresentlyDelinquent(Boolean presentlyDelinquent) {
        this.presentlyDelinquent = presentlyDelinquent;
        computeDerivedFields();
    }
    
    public Boolean getAlimonyChildSupport() {
        return alimonyChildSupport;
    }
    
    public void setAlimonyChildSupport(Boolean alimonyChildSupport) {
        this.alimonyChildSupport = alimonyChildSupport;
        computeDerivedFields();
    }
    
    public Boolean getBorrowingDownPayment() {
        return borrowingDownPayment;
    }
    
    public void setBorrowingDownPayment(Boolean borrowingDownPayment) {
        this.borrowingDownPayment = borrowingDownPayment;
        computeDerivedFields();
    }
    
    public Boolean getComakerEndorser() {
        return comakerEndorser;
    }
    
    public void setComakerEndorser(Boolean comakerEndorser) {
        this.comakerEndorser = comakerEndorser;
        computeDerivedFields();
    }
    
    public Boolean getUsCitizen() {
        return usCitizen;
    }
    
    public void setUsCitizen(Boolean usCitizen) {
        this.usCitizen = usCitizen;
        computeDerivedFields();
    }
    
    public Boolean getPermanentResident() {
        return permanentResident;
    }
    
    public void setPermanentResident(Boolean permanentResident) {
        this.permanentResident = permanentResident;
        computeDerivedFields();
    }
    
    public Boolean getIntentToOccupy() {
        return intentToOccupy;
    }
    
    public void setIntentToOccupy(Boolean intentToOccupy) {
        this.intentToOccupy = intentToOccupy;
        computeDerivedFields();
    }
    
    public Long getBorrowerId() {
        return borrowerId;
    }
    
    public void setBorrowerId(Long borrowerId) {
        this.borrowerId = borrowerId;
    }
    
    public Boolean getHasAdverseDeclarations() {
        return hasAdverseDeclarations;
    }
    
    public Boolean getHasLegalIssues() {
        return hasLegalIssues;
    }
    
    public Boolean getHasFinancialIssues() {
        return hasFinancialIssues;
    }
    
    public Integer getRiskScore() {
        return riskScore;
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
