package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "reo_properties")
public class REOProperty {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    @NotNull(message = "Borrower is required")
    private Borrower borrower;
    
    @Column(name = "sequence_number", nullable = false)
    @NotNull(message = "Sequence number is required")
    @Min(value = 1, message = "Sequence number must be positive")
    private Integer sequenceNumber;
    
    @Column(name = "address_line", nullable = false)
    @NotBlank(message = "Address line is required")
    @Size(max = 255, message = "Address line must not exceed 255 characters")
    private String addressLine;
    
    @Column(name = "city", nullable = false)
    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;
    
    @Column(name = "state", nullable = false)
    @NotBlank(message = "State is required")
    @Size(min = 2, max = 2, message = "State must be 2 characters")
    private String state;
    
    @Column(name = "zip_code", nullable = false)
    @NotBlank(message = "ZIP code is required")
    @Pattern(regexp = "\\d{5}(-\\d{4})?", message = "ZIP code must be in format 12345 or 12345-6789")
    private String zipCode;
    
    @Column(name = "property_type", nullable = false)
    @NotBlank(message = "Property type is required")
    @Pattern(regexp = "PrimaryResidence|SecondHome|Investment", 
             message = "Property type must be PrimaryResidence, SecondHome, or Investment")
    private String propertyType;
    
    @Column(name = "property_value", nullable = false, precision = 15, scale = 2)
    @NotNull(message = "Property value is required")
    @DecimalMin(value = "1000.00", message = "Property value must be at least $1,000")
    @DecimalMax(value = "99999999.99", message = "Property value cannot exceed $99,999,999.99")
    private BigDecimal propertyValue;
    
    @Column(name = "monthly_rental_income", precision = 15, scale = 2)
    @DecimalMin(value = "0.00", message = "Monthly rental income must be non-negative")
    private BigDecimal monthlyRentalIncome;
    
    @Column(name = "monthly_payment", precision = 15, scale = 2)
    @DecimalMin(value = "0.00", message = "Monthly payment must be non-negative")
    private BigDecimal monthlyPayment;
    
    @Column(name = "unpaid_balance", precision = 15, scale = 2)
    @DecimalMin(value = "0.00", message = "Unpaid balance must be non-negative")
    private BigDecimal unpaidBalance;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public REOProperty() {}
    
    public REOProperty(Borrower borrower, Integer sequenceNumber, String addressLine, String city, String state, String zipCode) {
        this.borrower = borrower;
        this.sequenceNumber = sequenceNumber;
        this.addressLine = addressLine;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
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
        REOProperty that = (REOProperty) o;
        return Objects.equals(id, that.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "REOProperty{" +
                "id=" + id +
                ", addressLine='" + addressLine + '\'' +
                ", city='" + city + '\'' +
                ", state='" + state + '\'' +
                ", zipCode='" + zipCode + '\'' +
                ", propertyType='" + propertyType + '\'' +
                ", propertyValue=" + propertyValue +
                ", monthlyRentalIncome=" + monthlyRentalIncome +
                ", monthlyPayment=" + monthlyPayment +
                '}';
    }
}
