package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "income_sources")
public class IncomeSource {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    @NotNull(message = "Borrower is required")
    private Borrower borrower;
    
    @Column(name = "income_type", nullable = false)
    @NotBlank(message = "Income type is required")
    @Pattern(regexp = "SocialSecurity|Pension|Disability|Unemployment|ChildSupport|Alimony|Investment|Rental|Other", 
             message = "Invalid income type")
    private String incomeType;
    
    @Column(name = "monthly_amount", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Monthly amount is required")
    @DecimalMin(value = "0.00", message = "Monthly amount must be non-negative")
    @DecimalMax(value = "999999.99", message = "Monthly amount cannot exceed $999,999.99")
    private BigDecimal monthlyAmount;
    
    @Column(name = "description")
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public IncomeSource() {}
    
    public IncomeSource(Borrower borrower, String incomeType, BigDecimal monthlyAmount) {
        this.borrower = borrower;
        this.incomeType = incomeType;
        this.monthlyAmount = monthlyAmount;
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
    public BigDecimal getAnnualAmount() {
        return monthlyAmount != null ? monthlyAmount.multiply(BigDecimal.valueOf(12)) : BigDecimal.ZERO;
    }
    
    public boolean isGovernmentBenefit() {
        return "SocialSecurity".equals(incomeType) || 
               "Disability".equals(incomeType) || 
               "Unemployment".equals(incomeType);
    }
    
    public boolean isInvestmentIncome() {
        return "Investment".equals(incomeType) || "Rental".equals(incomeType);
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
    
    public String getIncomeType() {
        return incomeType;
    }
    
    public void setIncomeType(String incomeType) {
        this.incomeType = incomeType;
    }
    
    public BigDecimal getMonthlyAmount() {
        return monthlyAmount;
    }
    
    public void setMonthlyAmount(BigDecimal monthlyAmount) {
        this.monthlyAmount = monthlyAmount;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
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
        IncomeSource that = (IncomeSource) o;
        return Objects.equals(id, that.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "IncomeSource{" +
                "id=" + id +
                ", incomeType='" + incomeType + '\'' +
                ", monthlyAmount=" + monthlyAmount +
                ", description='" + description + '\'' +
                '}';
    }
}
