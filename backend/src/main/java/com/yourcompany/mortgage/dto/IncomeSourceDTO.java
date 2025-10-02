package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class IncomeSourceDTO {
    
    private Long id;
    
    @NotBlank(message = "Income type is required")
    @Pattern(regexp = "SocialSecurity|Pension|Disability|Unemployment|ChildSupport|Alimony|Investment|Rental|Other", 
             message = "Invalid income type")
    private String incomeType;
    
    @NotNull(message = "Monthly amount is required")
    @DecimalMin(value = "0.01", message = "Monthly amount must be greater than 0")
    @DecimalMax(value = "999999.99", message = "Monthly amount cannot exceed $999,999.99")
    private BigDecimal monthlyAmount;
    
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
    
    // Read-only computed fields
    private BigDecimal annualAmount;
    private Boolean isGovernmentBenefit;
    private Boolean isInvestmentIncome;
    
    // Constructors
    public IncomeSourceDTO() {}
    
    public IncomeSourceDTO(String incomeType, BigDecimal monthlyAmount, String description) {
        this.incomeType = incomeType;
        this.monthlyAmount = monthlyAmount;
        this.description = description;
        computeDerivedFields();
    }
    
    // Business logic methods
    public void computeDerivedFields() {
        if (monthlyAmount != null) {
            this.annualAmount = monthlyAmount.multiply(BigDecimal.valueOf(12));
        } else {
            this.annualAmount = null;
        }
        
        this.isGovernmentBenefit = "SocialSecurity".equals(incomeType) || 
                                   "Disability".equals(incomeType) || 
                                   "Unemployment".equals(incomeType);
                                   
        this.isInvestmentIncome = "Investment".equals(incomeType) || "Rental".equals(incomeType);
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getIncomeType() {
        return incomeType;
    }
    
    public void setIncomeType(String incomeType) {
        this.incomeType = incomeType;
        computeDerivedFields();
    }
    
    public BigDecimal getMonthlyAmount() {
        return monthlyAmount;
    }
    
    public void setMonthlyAmount(BigDecimal monthlyAmount) {
        this.monthlyAmount = monthlyAmount;
        computeDerivedFields();
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public BigDecimal getAnnualAmount() {
        return annualAmount;
    }
    
    public Boolean getIsGovernmentBenefit() {
        return isGovernmentBenefit;
    }
    
    public Boolean getIsInvestmentIncome() {
        return isInvestmentIncome;
    }
}
