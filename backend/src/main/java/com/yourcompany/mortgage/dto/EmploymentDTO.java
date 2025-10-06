package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;

public class EmploymentDTO {
    
    private Long id;
    
    @NotNull(message = "Sequence number is required")
    @Min(value = 1, message = "Sequence number must be positive")
    private Integer sequenceNumber;
    
    @NotBlank(message = "Employer name is required")
    @Size(max = 100, message = "Employer name must not exceed 100 characters")
    private String employerName;
    
    @Size(max = 100, message = "Position must not exceed 100 characters")
    private String position;
    
    @Pattern(regexp = "^$|\\d{3}-\\d{3}-\\d{4}", message = "Phone must be in format 123-456-7890")
    private String employerPhone;
    
    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String employerAddress;
    
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String employerCity;
    
    @Size(min = 2, max = 2, message = "State must be 2 characters")
    private String employerState;
    
    @Pattern(regexp = "^$|\\d{5}(-\\d{4})?", message = "ZIP code must be in format 12345 or 12345-6789")
    private String employerZip;
    
    @NotNull(message = "Start date is required")
    @PastOrPresent(message = "Start date cannot be in the future")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;
    
    @NotNull(message = "Monthly income is required")
    @DecimalMin(value = "0.01", message = "Monthly income must be greater than 0")
    @DecimalMax(value = "999999.99", message = "Monthly income cannot exceed $999,999.99")
    private BigDecimal monthlyIncome;
    
    @NotBlank(message = "Employment status is required")
    @Pattern(regexp = "Present|Prior", message = "Employment status must be Present or Prior")
    private String employmentStatus;
    
    private Boolean isPresent = false;
    
    @NotNull(message = "Self-employed status is required")
    private Boolean selfEmployed = false;
    
    // Read-only computed fields
    private Integer durationMonths;
    private BigDecimal annualIncome;
    private String fullEmployerAddress;
    
    // Constructors
    public EmploymentDTO() {}
    
    public EmploymentDTO(Integer sequenceNumber, String employerName, String position, 
                        LocalDate startDate, BigDecimal monthlyIncome, String employmentStatus) {
        this.sequenceNumber = sequenceNumber;
        this.employerName = employerName;
        this.position = position;
        this.startDate = startDate;
        this.monthlyIncome = monthlyIncome;
        this.employmentStatus = employmentStatus;
        this.selfEmployed = false;
        computeDerivedFields();
    }
    
    // Business logic methods
    public void computeDerivedFields() {
        if (startDate != null) {
            LocalDate endDateToUse = endDate != null ? endDate : LocalDate.now();
            long months = Period.between(startDate, endDateToUse).toTotalMonths();
            this.durationMonths = (int) months;
        }
        
        if (monthlyIncome != null) {
            this.annualIncome = monthlyIncome.multiply(BigDecimal.valueOf(12));
        }
        
        if (employerAddress != null) {
            StringBuilder address = new StringBuilder(employerAddress);
            if (employerCity != null && !employerCity.isBlank()) address.append(", ").append(employerCity);
            if (employerState != null && !employerState.isBlank()) address.append(", ").append(employerState);
            if (employerZip != null && !employerZip.isBlank()) address.append(" ").append(employerZip);
            this.fullEmployerAddress = address.toString();
        }
    }
    
    public boolean isCurrent() {
        return "Present".equals(employmentStatus);
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
    
    public String getEmployerName() {
        return employerName;
    }
    
    public void setEmployerName(String employerName) {
        this.employerName = employerName;
    }
    
    public String getPosition() {
        return position;
    }
    
    public void setPosition(String position) {
        this.position = position;
    }
    
    public String getEmployerPhone() {
        return employerPhone;
    }
    
    public void setEmployerPhone(String employerPhone) {
        this.employerPhone = employerPhone;
    }
    
    public String getEmployerAddress() {
        return employerAddress;
    }
    
    public void setEmployerAddress(String employerAddress) {
        this.employerAddress = employerAddress;
        computeDerivedFields();
    }
    
    public String getEmployerCity() {
        return employerCity;
    }
    
    public void setEmployerCity(String employerCity) {
        this.employerCity = employerCity;
        computeDerivedFields();
    }
    
    public String getEmployerState() {
        return employerState;
    }
    
    public void setEmployerState(String employerState) {
        this.employerState = employerState;
        computeDerivedFields();
    }
    
    public String getEmployerZip() {
        return employerZip;
    }
    
    public void setEmployerZip(String employerZip) {
        this.employerZip = employerZip;
        computeDerivedFields();
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
        computeDerivedFields();
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
        computeDerivedFields();
    }
    
    public BigDecimal getMonthlyIncome() {
        return monthlyIncome;
    }
    
    public void setMonthlyIncome(BigDecimal monthlyIncome) {
        this.monthlyIncome = monthlyIncome;
        computeDerivedFields();
    }
    
    public String getEmploymentStatus() {
        return employmentStatus;
    }
    
    public void setEmploymentStatus(String employmentStatus) {
        this.employmentStatus = employmentStatus;
    }
    
    public Boolean getIsPresent() {
        return isPresent;
    }
    
    public void setIsPresent(Boolean isPresent) {
        this.isPresent = isPresent;
    }
    
    public Boolean getSelfEmployed() {
        return selfEmployed;
    }
    
    public void setSelfEmployed(Boolean selfEmployed) {
        this.selfEmployed = selfEmployed;
    }
    
    public Integer getDurationMonths() {
        return durationMonths;
    }
    
    public BigDecimal getAnnualIncome() {
        return annualIncome;
    }
    
    public String getFullEmployerAddress() {
        return fullEmployerAddress;
    }
}
