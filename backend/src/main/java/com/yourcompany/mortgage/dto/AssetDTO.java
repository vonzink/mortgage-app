package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetDTO {
    
    private Long id;
    
    @NotBlank(message = "Asset type is required")
    @Pattern(regexp = "Checking|Savings|MoneyMarket|CertificateOfDeposit|MutualFunds|Stocks|Bonds|Retirement401k|IRA|Pension|EarnestMoney|Other", 
             message = "Invalid asset type")
    private String assetType;
    
    @Size(max = 100, message = "Bank name must not exceed 100 characters")
    private String bankName;
    
    @Size(max = 50, message = "Account number must not exceed 50 characters")
    private String accountNumber;
    
    @NotNull(message = "Asset value is required")
    @DecimalMin(value = "0.00", message = "Asset value must be non-negative")
    @DecimalMax(value = "99999999.99", message = "Asset value cannot exceed $99,999,999.99")
    private BigDecimal assetValue;
    
    @NotNull(message = "Used for downpayment status is required")
    private Boolean usedForDownpayment;
    
    // Optional: owner field for UI purposes (not persisted directly on Asset)
    private String owner;
}

