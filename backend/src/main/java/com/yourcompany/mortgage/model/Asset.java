package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets")
public class Asset {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    @NotNull(message = "Borrower is required")
    private Borrower borrower;
    
    @Column(name = "asset_type", nullable = false)
    @NotBlank(message = "Asset type is required")
    @Pattern(regexp = "Checking|Savings|MoneyMarket|CertificateOfDeposit|MutualFunds|Stocks|Bonds|Retirement401k|IRA|Pension|EarnestMoney|Other", 
             message = "Invalid asset type")
    private String assetType;
    
    @Column(name = "bank_name")
    @Size(max = 100, message = "Bank name must not exceed 100 characters")
    private String bankName;
    
    @Column(name = "account_number")
    @Size(max = 50, message = "Account number must not exceed 50 characters")
    private String accountNumber;
    
    @Column(name = "asset_value", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Asset value is required")
    @DecimalMin(value = "0.00", message = "Asset value must be non-negative")
    @DecimalMax(value = "99999999.99", message = "Asset value cannot exceed $99,999,999.99")
    private BigDecimal assetValue;
    
    @Column(name = "used_for_downpayment", nullable = false)
    @NotNull(message = "Used for downpayment status is required")
    private Boolean usedForDownpayment = false;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public Asset() {}
    
    public Asset(Borrower borrower, String assetType, BigDecimal assetValue) {
        this.borrower = borrower;
        this.assetType = assetType;
        this.assetValue = assetValue;
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

    public String getAssetType() {
        return assetType;
    }

    public void setAssetType(String assetType) {
        this.assetType = assetType;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public BigDecimal getAssetValue() {
        return assetValue;
    }

    public void setAssetValue(BigDecimal assetValue) {
        this.assetValue = assetValue;
    }

    public Boolean getUsedForDownpayment() {
        return usedForDownpayment;
    }

    public void setUsedForDownpayment(Boolean usedForDownpayment) {
        this.usedForDownpayment = usedForDownpayment;
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
    public String toString() {
        return "Asset{" +
                "id=" + id +
                ", assetType='" + assetType + '\'' +
                ", bankName='" + bankName + '\'' +
                ", assetValue=" + assetValue +
                ", usedForDownpayment=" + usedForDownpayment +
                '}';
    }
}

