package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Optimized Liability entity with Lombok annotations and improved structure
 */
@Entity
@Table(name = "liabilities")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"application", "borrower"})
public class LiabilityOptimized {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    @NotNull(message = "Application is required")
    @ToString.Exclude
    private LoanApplication application;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id")
    @ToString.Exclude
    private Borrower borrower;
    
    @Column(name = "account_number")
    @Size(max = 50, message = "Account number must not exceed 50 characters")
    private String accountNumber;
    
    @Column(name = "creditor_name", nullable = false)
    @NotBlank(message = "Creditor name is required")
    @Size(max = 100, message = "Creditor name must not exceed 100 characters")
    private String creditorName;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "liability_type", nullable = false)
    @NotNull(message = "Liability type is required")
    private LiabilityType liabilityType;
    
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
    @Builder.Default
    private Boolean payoffStatus = false;
    
    @Column(name = "to_be_paid_off", nullable = false)
    @Builder.Default
    private Boolean toBePaidOff = false;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    /**
     * Liability type enumeration for better type safety
     */
    public enum LiabilityType {
        MORTGAGE_LOAN("Mortgage Loan"),
        REVOLVING("Revolving"),
        INSTALLMENT("Installment"),
        STUDENT_LOAN("Student Loan"),
        AUTO_LOAN("Auto Loan"),
        CREDIT_CARD("Credit Card"),
        OTHER("Other");
        
        private final String displayName;
        
        LiabilityType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    /**
     * Calculate debt-to-income ratio
     */
    public BigDecimal getDebtToIncomeRatio(BigDecimal monthlyIncome) {
        if (monthlyIncome == null || monthlyIncome.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return monthlyPayment.divide(monthlyIncome, 4, BigDecimal.ROUND_HALF_UP);
    }
    
    /**
     * Check if this is a revolving liability
     */
    public boolean isRevolving() {
        return liabilityType == LiabilityType.REVOLVING || liabilityType == LiabilityType.CREDIT_CARD;
    }
    
    /**
     * Check if this is a mortgage liability
     */
    public boolean isMortgage() {
        return liabilityType == LiabilityType.MORTGAGE_LOAN;
    }
    
    /**
     * Check if this is consumer debt
     */
    public boolean isConsumerDebt() {
        return liabilityType == LiabilityType.CREDIT_CARD || 
               liabilityType == LiabilityType.AUTO_LOAN || 
               liabilityType == LiabilityType.INSTALLMENT;
    }
    
    /**
     * Get masked account number for security
     */
    public String getMaskedAccountNumber() {
        if (accountNumber == null || accountNumber.length() < 4) {
            return accountNumber;
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }
    
    /**
     * Calculate total liability impact
     */
    public BigDecimal getTotalLiabilityImpact() {
        if (monthlyPayment == null && unpaidBalance == null) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal paymentImpact = monthlyPayment != null ? monthlyPayment : BigDecimal.ZERO;
        BigDecimal balanceImpact = unpaidBalance != null ? unpaidBalance.divide(BigDecimal.valueOf(12), 2, BigDecimal.ROUND_HALF_UP) : BigDecimal.ZERO;
        
        return paymentImpact.add(balanceImpact);
    }
    
    /**
     * Check if liability should be considered for debt-to-income calculation
     */
    public boolean shouldIncludeInDTI() {
        return !Boolean.TRUE.equals(payoffStatus) && monthlyPayment != null && monthlyPayment.compareTo(BigDecimal.ZERO) > 0;
    }
    
    /**
     * Get liability priority for payoff recommendations
     */
    public int getPayoffPriority() {
        if (Boolean.TRUE.equals(payoffStatus)) {
            return 0; // Already paid off
        }
        
        return switch (liabilityType) {
            case CREDIT_CARD -> 1; // Highest priority (highest interest)
            case REVOLVING -> 2;
            case AUTO_LOAN -> 3;
            case INSTALLMENT -> 4;
            case STUDENT_LOAN -> 5;
            case MORTGAGE_LOAN -> 6; // Lowest priority (lowest interest)
            case OTHER -> 7;
        };
    }
}
