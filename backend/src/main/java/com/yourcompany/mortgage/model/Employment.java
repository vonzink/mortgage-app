package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.Objects;

@Entity
@Table(name = "employment")
public class Employment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    @NotNull(message = "Borrower is required")
    private Borrower borrower;
    
    @Column(name = "sequence_number", nullable = false)
    @NotNull(message = "Sequence number is required")
    @Min(value = 1, message = "Sequence number must be positive")
    private Integer sequenceNumber;
    
    @Column(name = "employer_name", nullable = false)
    @NotBlank(message = "Employer name is required")
    @Size(max = 100, message = "Employer name must not exceed 100 characters")
    private String employerName;
    
    @Column(name = "position")
    @Size(max = 100, message = "Position must not exceed 100 characters")
    private String position;
    
    @Column(name = "employer_phone")
    @Pattern(regexp = "\\d{3}-\\d{3}-\\d{4}", message = "Phone must be in format 123-456-7890")
    private String employerPhone;
    
    @Column(name = "employer_address")
    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String employerAddress;
    
    @Column(name = "employer_city")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String employerCity;
    
    @Column(name = "employer_state")
    @Size(min = 2, max = 2, message = "State must be 2 characters")
    private String employerState;
    
    @Column(name = "employer_zip")
    @Pattern(regexp = "\\d{5}(-\\d{4})?", message = "ZIP code must be in format 12345 or 12345-6789")
    private String employerZip;
    
    @Column(name = "start_date", nullable = false)
    @NotNull(message = "Start date is required")
    @PastOrPresent(message = "Start date cannot be in the future")
    private LocalDate startDate;
    
    @Column(name = "end_date")
    private LocalDate endDate;
    
    @Column(name = "monthly_income", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Monthly income is required")
    @DecimalMin(value = "0.00", message = "Monthly income must be non-negative")
    @DecimalMax(value = "999999.99", message = "Monthly income cannot exceed $999,999.99")
    private BigDecimal monthlyIncome;
    
    @Column(name = "employment_status", nullable = false)
    @NotBlank(message = "Employment status is required")
    @Pattern(regexp = "Present|Prior", message = "Employment status must be Present or Prior")
    private String employmentStatus;
    
    @Column(name = "is_present")
    private Boolean isPresent = false;
    
    @Column(name = "self_employed", nullable = false)
    @NotNull(message = "Self-employed status is required")
    private Boolean selfEmployed = false;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public Employment() {}
    
    public Employment(Borrower borrower, Integer sequenceNumber, String employerName, String employmentStatus) {
        this.borrower = borrower;
        this.sequenceNumber = sequenceNumber;
        this.employerName = employerName;
        this.employmentStatus = employmentStatus;
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
    public int getEmploymentDurationMonths() {
        LocalDate endDateToUse = endDate != null ? endDate : LocalDate.now();
        return (int) Period.between(startDate, endDateToUse).toTotalMonths();
    }
    
    public BigDecimal getAnnualIncome() {
        return monthlyIncome != null ? monthlyIncome.multiply(BigDecimal.valueOf(12)) : BigDecimal.ZERO;
    }
    
    public boolean isCurrent() {
        return "Present".equals(employmentStatus);
    }
    
    public String getFullEmployerAddress() {
        if (employerAddress == null) return null;
        
        StringBuilder address = new StringBuilder(employerAddress);
        if (employerCity != null) address.append(", ").append(employerCity);
        if (employerState != null) address.append(", ").append(employerState);
        if (employerZip != null) address.append(" ").append(employerZip);
        
        return address.toString();
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
    }
    
    public String getEmployerCity() {
        return employerCity;
    }
    
    public void setEmployerCity(String employerCity) {
        this.employerCity = employerCity;
    }
    
    public String getEmployerState() {
        return employerState;
    }
    
    public void setEmployerState(String employerState) {
        this.employerState = employerState;
    }
    
    public String getEmployerZip() {
        return employerZip;
    }
    
    public void setEmployerZip(String employerZip) {
        this.employerZip = employerZip;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
    
    public BigDecimal getMonthlyIncome() {
        return monthlyIncome;
    }
    
    public void setMonthlyIncome(BigDecimal monthlyIncome) {
        this.monthlyIncome = monthlyIncome;
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
        Employment that = (Employment) o;
        return Objects.equals(id, that.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "Employment{" +
                "id=" + id +
                ", employerName='" + employerName + '\'' +
                ", position='" + position + '\'' +
                ", employmentStatus='" + employmentStatus + '\'' +
                ", monthlyIncome=" + monthlyIncome +
                ", selfEmployed=" + selfEmployed +
                '}';
    }
}
