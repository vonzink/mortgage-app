package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class REOPropertyDTO {
    
    private Long id;
    
    @NotNull(message = "Sequence number is required")
    @Min(value = 1, message = "Sequence number must be positive")
    private Integer sequenceNumber;
    
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
    
    @NotBlank(message = "Property type is required")
    @Pattern(regexp = "PrimaryResidence|SecondHome|Investment", 
             message = "Property type must be PrimaryResidence, SecondHome, or Investment")
    private String propertyType;
    
    @NotNull(message = "Property value is required")
    @DecimalMin(value = "1000.00", message = "Property value must be at least $1,000")
    @DecimalMax(value = "99999999.99", message = "Property value cannot exceed $99,999,999.99")
    private BigDecimal propertyValue;
    
    @DecimalMin(value = "0.00", message = "Monthly rental income must be non-negative")
    private BigDecimal monthlyRentalIncome;
    
    @DecimalMin(value = "0.00", message = "Monthly payment must be non-negative")
    private BigDecimal monthlyPayment;
    
    @DecimalMin(value = "0.00", message = "Unpaid balance must be non-negative")
    private BigDecimal unpaidBalance;
    
    // Constructors
    public REOPropertyDTO() {}
    
    public REOPropertyDTO(Integer sequenceNumber, String addressLine, String city, String state, String zipCode, String propertyType, BigDecimal propertyValue) {
        this.sequenceNumber = sequenceNumber;
        this.addressLine = addressLine;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.propertyType = propertyType;
        this.propertyValue = propertyValue;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getSequenceNumber() {
        return sequenceNumber;
    }
    
    public void setSequenceNumber(Integer sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }
    
    public String getAddressLine() {
        return addressLine;
    }
    
    public void setAddressLine(String addressLine) {
        this.addressLine = addressLine;
    }
    
    public String getCity() {
        return city;
    }
    
    public void setCity(String city) {
        this.city = city;
    }
    
    public String getState() {
        return state;
    }
    
    public void setState(String state) {
        this.state = state;
    }
    
    public String getZipCode() {
        return zipCode;
    }
    
    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }
    
    public String getPropertyType() {
        return propertyType;
    }
    
    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }
    
    public BigDecimal getPropertyValue() {
        return propertyValue;
    }
    
    public void setPropertyValue(BigDecimal propertyValue) {
        this.propertyValue = propertyValue;
    }
    
    public BigDecimal getMonthlyRentalIncome() {
        return monthlyRentalIncome;
    }
    
    public void setMonthlyRentalIncome(BigDecimal monthlyRentalIncome) {
        this.monthlyRentalIncome = monthlyRentalIncome;
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
    
    // Utility methods
    public String getFullAddress() {
        StringBuilder address = new StringBuilder(addressLine);
        if (city != null) {
            address.append(", ").append(city);
        }
        if (state != null) {
            address.append(", ").append(state);
        }
        if (zipCode != null) {
            address.append(" ").append(zipCode);
        }
        return address.toString();
    }
    
    public BigDecimal getNetMonthlyIncome() {
        if (monthlyRentalIncome == null) return BigDecimal.ZERO;
        if (monthlyPayment == null) return monthlyRentalIncome;
        return monthlyRentalIncome.subtract(monthlyPayment);
    }
}
