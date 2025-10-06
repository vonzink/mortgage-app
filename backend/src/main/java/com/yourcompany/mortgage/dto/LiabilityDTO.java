package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class LiabilityDTO {
    
    private Long id;
    
    @Size(max = 50, message = "Account number must not exceed 50 characters")
    private String accountNumber;
    
    @NotBlank(message = "Creditor name is required")
    @Size(max = 100, message = "Creditor name must not exceed 100 characters")
    private String creditorName;
    
    @NotBlank(message = "Liability type is required")
    @Pattern(regexp = "MortgageLoan|Revolving|Installment|StudentLoan|AutoLoan|CreditCard|Other", 
             message = "Invalid liability type")
    private String liabilityType;
    
    @NotNull(message = "Monthly payment is required")
    @DecimalMin(value = "0.00", message = "Monthly payment must be non-negative")
    @DecimalMax(value = "99999.99", message = "Monthly payment cannot exceed $99,999.99")
    private BigDecimal monthlyPayment;
    
    @NotNull(message = "Unpaid balance is required")
    @DecimalMin(value = "0.00", message = "Unpaid balance must be non-negative")
    @DecimalMax(value = "9999999.99", message = "Unpaid balance cannot exceed $9,999,999.99")
    private BigDecimal unpaidBalance;
    
    @NotNull(message = "Payoff status is required")
    private Boolean payoffStatus = false;
    
    @NotNull(message = "To be paid off status is required")
    private Boolean toBePaidOff = false;
    
    private Long borrowerId; // For association
    
    // Read-only computed fields
    private String maskedAccountNumber;
    private Boolean isRevolving;
    private Boolean isMortgage;
    private Boolean isConsumerDebt;
    
    // Constructors
    public LiabilityDTO() {}
    
    public LiabilityDTO(String creditorName, String liabilityType, BigDecimal monthlyPayment, BigDecimal unpaidBalance) {
        this.creditorName = creditorName;
        this.liabilityType = liabilityType;
        this.monthlyPayment = monthlyPayment;
        this.unpaidBalance = unpaidBalance;
        computeDerivedFields();
    }
    
    // Business logic methods
    public void computeDerivedFields() {
        if (accountNumber != null && accountNumber.length() >= 4) {
            this.maskedAccountNumber = "****" + accountNumber.substring(accountNumber.length() - 4);
        } else {
            this.maskedAccountNumber = accountNumber;
        }
        
        this.isRevolving = "Revolving".equals(liabilityType) || "CreditCard".equals(liabilityType);
        this.isMortgage = "MortgageLoan".equals(liabilityType);
        this.isConsumerDebt = "CreditCard".equals(liabilityType) || 
                             "AutoLoan".equals(liabilityType) || 
                             "Installment".equals(liabilityType);
    }
    
    public BigDecimal getDebtToIncomeRatio(BigDecimal monthlyIncome) {
        if (monthlyIncome == null || monthlyIncome.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return monthlyPayment.divide(monthlyIncome, 4, java.math.RoundingMode.HALF_UP);
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getAccountNumber() {
        return accountNumber;
    }
    
    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
        computeDerivedFields();
    }
    
    public String getCreditorName() {
        return creditorName;
    }
    
    public void setCreditorName(String creditorName) {
        this.creditorName = creditorName;
    }
    
    public String getLiabilityType() {
        return liabilityType;
    }
    
    public void setLiabilityType(String liabilityType) {
        this.liabilityType = liabilityType;
        computeDerivedFields();
    }
    
    public BigDecimal getMonthlyPayment() {
        return monthlyPayment;
    }
    
    public void setMonthlyPayment(BigDecimal monthlyPayment) {
        this.monthlyPayment = monthlyPayment;
    }
    
    public BigDecimal getUnpaidBalance() {
        return unpaidBalance;
    }
    
    public void setUnpaidBalance(BigDecimal unpaidBalance) {
        this.unpaidBalance = unpaidBalance;
    }
    
    public Boolean getPayoffStatus() {
        return payoffStatus;
    }
    
    public void setPayoffStatus(Boolean payoffStatus) {
        this.payoffStatus = payoffStatus;
    }
    
    public Boolean getToBePaidOff() {
        return toBePaidOff;
    }
    
    public void setToBePaidOff(Boolean toBePaidOff) {
        this.toBePaidOff = toBePaidOff;
    }
    
    public Long getBorrowerId() {
        return borrowerId;
    }
    
    public void setBorrowerId(Long borrowerId) {
        this.borrowerId = borrowerId;
    }
    
    public String getMaskedAccountNumber() {
        return maskedAccountNumber;
    }
    
    public Boolean getIsRevolving() {
        return isRevolving;
    }
    
    public Boolean getIsMortgage() {
        return isMortgage;
    }
    
    public Boolean getIsConsumerDebt() {
        return isConsumerDebt;
    }
}
