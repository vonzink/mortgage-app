package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "liabilities")
public class Liability {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    @NotNull(message = "Application is required")
    private LoanApplication application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id")
    private Borrower borrower;
    
    @Column(name = "account_number")
    @Size(max = 50, message = "Account number must not exceed 50 characters")
    private String accountNumber;
    
    @Column(name = "creditor_name", nullable = false)
    @NotBlank(message = "Creditor name is required")
    @Size(max = 100, message = "Creditor name must not exceed 100 characters")
    private String creditorName;
    
    @Column(name = "liability_type", nullable = false)
    @NotBlank(message = "Liability type is required")
    @Pattern(regexp = "MortgageLoan|Revolving|Installment|StudentLoan|AutoLoan|CreditCard|Other", 
             message = "Invalid liability type")
    private String liabilityType;
    
    @Column(name = "monthly_payment", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Monthly payment is required")
    @DecimalMin(value = "0.00", message = "Monthly payment must be non-negative")
    @DecimalMax(value = "99999.99", message = "Monthly payment cannot exceed $99,999.99")
    private BigDecimal monthlyPayment;
    
    @Column(name = "unpaid_balance", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Unpaid balance is required")
    @DecimalMin(value = "0.00", message = "Unpaid balance must be non-negative")
    @DecimalMax(value = "9999999.99", message = "Unpaid balance cannot exceed $9,999,999.99")
    private BigDecimal unpaidBalance;
    
    @Column(name = "payoff_status", nullable = false)
    @NotNull(message = "Payoff status is required")
    private Boolean payoffStatus = false;
    
    @Column(name = "to_be_paid_off", nullable = false)
    @NotNull(message = "To be paid off status is required")
    private Boolean toBePaidOff = false;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public Liability() {}
    
    public Liability(LoanApplication application, String creditorName, String liabilityType) {
        this.application = application;
        this.creditorName = creditorName;
        this.liabilityType = liabilityType;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Utility methods
    public BigDecimal getDebtToIncomeRatio(BigDecimal monthlyIncome) {
        if (monthlyIncome == null || monthlyIncome.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return monthlyPayment.divide(monthlyIncome, 4, java.math.RoundingMode.HALF_UP);
    }
    
    public boolean isRevolving() {
        return "Revolving".equals(liabilityType) || "CreditCard".equals(liabilityType);
    }
    
    public boolean isMortgage() {
        return "MortgageLoan".equals(liabilityType);
    }
    
    public boolean isConsumerDebt() {
        return "CreditCard".equals(liabilityType) || "AutoLoan".equals(liabilityType) || "Installment".equals(liabilityType);
    }
    
    public String getMaskedAccountNumber() {
        if (accountNumber == null || accountNumber.length() < 4) {
            return accountNumber;
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public LoanApplication getApplication() {
        return application;
    }
    
    public void setApplication(LoanApplication application) {
        this.application = application;
    }
    
    public Borrower getBorrower() {
        return borrower;
    }
    
    public void setBorrower(Borrower borrower) {
        this.borrower = borrower;
    }
    
    public String getAccountNumber() {
        return accountNumber;
    }
    
    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
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
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Liability liability = (Liability) o;
        return Objects.equals(id, liability.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "Liability{" +
                "id=" + id +
                ", creditorName='" + creditorName + '\'' +
                ", liabilityType='" + liabilityType + '\'' +
                ", monthlyPayment=" + monthlyPayment +
                ", unpaidBalance=" + unpaidBalance +
                ", payoffStatus=" + payoffStatus +
                '}';
    }
}
