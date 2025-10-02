package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public class LoanApplicationDTO {
    
    @NotBlank(message = "Loan purpose is required")
    private String loanPurpose;
    
    @NotBlank(message = "Loan type is required")
    private String loanType;
    
    @NotNull(message = "Loan amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Loan amount must be greater than 0")
    private BigDecimal loanAmount;
    
    @NotNull(message = "Property value is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Property value must be greater than 0")
    private BigDecimal propertyValue;
    
    private String status = "DRAFT";
    
    private PropertyDTO property;
    
    private List<BorrowerDTO> borrowers;
    
    private List<LiabilityDTO> liabilities;
    
    // Constructors
    public LoanApplicationDTO() {}
    
    public LoanApplicationDTO(String loanPurpose, String loanType, BigDecimal loanAmount, BigDecimal propertyValue) {
        this.loanPurpose = loanPurpose;
        this.loanType = loanType;
        this.loanAmount = loanAmount;
        this.propertyValue = propertyValue;
    }
    
    // Getters and Setters
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
    
    public PropertyDTO getProperty() {
        return property;
    }
    
    public void setProperty(PropertyDTO property) {
        this.property = property;
    }
    
    public List<BorrowerDTO> getBorrowers() {
        return borrowers;
    }
    
    public void setBorrowers(List<BorrowerDTO> borrowers) {
        this.borrowers = borrowers;
    }
    
    public List<LiabilityDTO> getLiabilities() {
        return liabilities;
    }
    
    public void setLiabilities(List<LiabilityDTO> liabilities) {
        this.liabilities = liabilities;
    }
}
