package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class ResidenceDTO {
    
    private Long id;
    
    @NotBlank(message = "Address line is required")
    @Size(max = 255, message = "Address line must not exceed 255 characters")
    private String addressLine;
    
    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;
    
    @NotBlank(message = "State is required")
    @Size(min = 2, max = 2, message = "State must be 2 characters")
    private String state;
    
    @NotBlank(message = "ZIP code is required")
    @Pattern(regexp = "\\d{5}(-\\d{4})?", message = "ZIP code must be in format 12345 or 12345-6789")
    private String zipCode;
    
    @NotBlank(message = "Residency type is required")
    @Pattern(regexp = "Current|Prior", message = "Residency type must be Current or Prior")
    private String residencyType;
    
    @NotBlank(message = "Residency basis is required")
    @Pattern(regexp = "Own|Rent|LivingRentFree", message = "Residency basis must be Own, Rent, or LivingRentFree")
    private String residencyBasis;
    
    @NotNull(message = "Duration in months is required")
    @Min(value = 1, message = "Duration must be at least 1 month")
    @Max(value = 600, message = "Duration cannot exceed 600 months (50 years)")
    private Integer durationMonths;
    
    @DecimalMin(value = "0.00", message = "Monthly rent must be non-negative")
    @DecimalMax(value = "99999.99", message = "Monthly rent cannot exceed $99,999.99")
    private BigDecimal monthlyRent;
    
    private Long borrowerId; // For association
    
    // Read-only computed fields
    private String fullAddress;
    private Boolean isCurrentResidence;
    private Boolean isRental;
    private BigDecimal annualHousingCost;
    
    // Constructors
    public ResidenceDTO() {}
    
    public ResidenceDTO(String addressLine, String city, String state, String zipCode, 
                       String residencyType, String residencyBasis, Integer durationMonths) {
        this.addressLine = addressLine;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.residencyType = residencyType;
        this.residencyBasis = residencyBasis;
        this.durationMonths = durationMonths;
        computeDerivedFields();
    }
    
    // Business logic methods
    public void computeDerivedFields() {
        if (addressLine != null) {
            StringBuilder address = new StringBuilder(addressLine);
            if (city != null) address.append(", ").append(city);
            if (state != null) address.append(", ").append(state);
            if (zipCode != null) address.append(" ").append(zipCode);
            this.fullAddress = address.toString();
        }
        
        this.isCurrentResidence = "Current".equals(residencyType);
        this.isRental = "Rent".equals(residencyBasis);
        
        if (monthlyRent != null && Boolean.TRUE.equals(isRental)) {
            this.annualHousingCost = monthlyRent.multiply(BigDecimal.valueOf(12));
        } else {
            this.annualHousingCost = BigDecimal.ZERO;
        }
    }
    
    public boolean requiresRentAmount() {
        return "Rent".equals(residencyBasis);
    }
    
    public int getDurationYears() {
        return durationMonths != null ? durationMonths / 12 : 0;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getAddressLine() {
        return addressLine;
    }
    
    public void setAddressLine(String addressLine) {
        this.addressLine = addressLine;
        computeDerivedFields();
    }
    
    public String getCity() {
        return city;
    }
    
    public void setCity(String city) {
        this.city = city;
        computeDerivedFields();
    }
    
    public String getState() {
        return state;
    }
    
    public void setState(String state) {
        this.state = state;
        computeDerivedFields();
    }
    
    public String getZipCode() {
        return zipCode;
    }
    
    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
        computeDerivedFields();
    }
    
    public String getResidencyType() {
        return residencyType;
    }
    
    public void setResidencyType(String residencyType) {
        this.residencyType = residencyType;
        computeDerivedFields();
    }
    
    public String getResidencyBasis() {
        return residencyBasis;
    }
    
    public void setResidencyBasis(String residencyBasis) {
        this.residencyBasis = residencyBasis;
        computeDerivedFields();
    }
    
    public Integer getDurationMonths() {
        return durationMonths;
    }
    
    public void setDurationMonths(Integer durationMonths) {
        this.durationMonths = durationMonths;
    }
    
    public BigDecimal getMonthlyRent() {
        return monthlyRent;
    }
    
    public void setMonthlyRent(BigDecimal monthlyRent) {
        this.monthlyRent = monthlyRent;
        computeDerivedFields();
    }
    
    public Long getBorrowerId() {
        return borrowerId;
    }
    
    public void setBorrowerId(Long borrowerId) {
        this.borrowerId = borrowerId;
    }
    
    public String getFullAddress() {
        return fullAddress;
    }
    
    public Boolean getIsCurrentResidence() {
        return isCurrentResidence;
    }
    
    public Boolean getIsRental() {
        return isRental;
    }
    
    public BigDecimal getAnnualHousingCost() {
        return annualHousingCost;
    }
}
