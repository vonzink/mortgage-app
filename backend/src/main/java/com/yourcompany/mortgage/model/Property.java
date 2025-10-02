package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "properties")
public class Property {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private LoanApplication application;
    
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
    
    @Column(name = "county")
    @Size(max = 100, message = "County must not exceed 100 characters")
    private String county;
    
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
    
    @Column(name = "construction_type")
    @Pattern(regexp = "SiteBuilt|Manufactured", 
             message = "Construction type must be SiteBuilt or Manufactured")
    private String constructionType;
    
    @Column(name = "year_built")
    @Min(value = 1800, message = "Year built must be after 1800")
    @Max(value = 2030, message = "Year built cannot be in the future")
    private Integer yearBuilt;
    
    @Column(name = "units_count", nullable = false)
    @NotNull(message = "Units count is required")
    @Min(value = 1, message = "Units count must be at least 1")
    @Max(value = 4, message = "Units count cannot exceed 4 for residential properties")
    private Integer unitsCount = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public Property() {}
    
    public Property(LoanApplication application, String addressLine, String city, String state, String zipCode) {
        this.application = application;
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
    
    public String getCounty() {
        return county;
    }
    
    public void setCounty(String county) {
        this.county = county;
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
    
    public String getConstructionType() {
        return constructionType;
    }
    
    public void setConstructionType(String constructionType) {
        this.constructionType = constructionType;
    }
    
    public Integer getYearBuilt() {
        return yearBuilt;
    }
    
    public void setYearBuilt(Integer yearBuilt) {
        this.yearBuilt = yearBuilt;
    }
    
    public Integer getUnitsCount() {
        return unitsCount;
    }
    
    public void setUnitsCount(Integer unitsCount) {
        this.unitsCount = unitsCount;
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
    
    public boolean isMultiUnit() {
        return unitsCount != null && unitsCount > 1;
    }
    
    public int getPropertyAge() {
        if (yearBuilt == null) {
            return 0;
        }
        return java.time.Year.now().getValue() - yearBuilt;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Property property = (Property) o;
        return Objects.equals(id, property.id);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
    
    @Override
    public String toString() {
        return "Property{" +
                "id=" + id +
                ", addressLine='" + addressLine + '\'' +
                ", city='" + city + '\'' +
                ", state='" + state + '\'' +
                ", zipCode='" + zipCode + '\'' +
                ", propertyType='" + propertyType + '\'' +
                ", propertyValue=" + propertyValue +
                ", unitsCount=" + unitsCount +
                '}';
    }
}
