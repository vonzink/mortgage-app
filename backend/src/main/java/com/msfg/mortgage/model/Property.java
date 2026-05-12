package com.msfg.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
    @JoinColumn(name = "application_id")
    @JsonBackReference
    private LoanApplication application;
    
    @Column(name = "address_line")
    @Size(max = 255, message = "Address line must not exceed 255 characters")
    private String addressLine;
    
    @Column(name = "city")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;
    
    @Column(name = "state")
    @Size(min = 2, max = 2, message = "State must be 2 characters")
    private String state;
    
    @Column(name = "zip_code")
    @Pattern(regexp = "\\d{5}(-\\d{4})?", message = "ZIP code must be in format 12345 or 12345-6789")
    private String zipCode;
    
    @Column(name = "county")
    @Size(max = 100, message = "County must not exceed 100 characters")
    private String county;
    
    /**
     * Optional during application drafting and partial MISMO imports — borrower may not
     * have a property selected yet, and LP exports don't always include this field.
     * The borrower form's required-field UX enforces it at submit time.
     */
    /**
     * Free-text property usage. Form dropdown values:
     * PrimaryResidence | SecondHome | Investment.
     * MISMO 3.4 also emits these. No DB-level enum check.
     */
    @Column(name = "property_type")
    private String propertyType;

    /** Same — optional in drafts. */
    @Column(name = "property_value", precision = 15, scale = 2)
    @DecimalMin(value = "1000.00", message = "Property value must be at least $1,000")
    @DecimalMax(value = "99999999.99", message = "Property value cannot exceed $99,999,999.99")
    private BigDecimal propertyValue;
    
    /**
     * Free-text construction method. Form dropdown values:
     * SiteBuilt | Manufactured. MISMO 3.4 also emits Modular, OnFrameModular,
     * MobileHome, etc. — these flow through to the LO without rejection.
     */
    @Column(name = "construction_type")
    private String constructionType;
    
    @Column(name = "year_built")
    @Min(value = 1800, message = "Year built must be after 1800")
    @Max(value = 2030, message = "Year built cannot be in the future")
    private Integer yearBuilt;
    
    @Column(name = "units_count")
    @Min(value = 1, message = "Units count must be at least 1")
    @Max(value = 4, message = "Units count cannot exceed 4 for residential properties")
    private Integer unitsCount = 1;

    /** Purchase loans: SalesContractAmount. Refis: typically null. */
    @Column(name = "purchase_price", precision = 15, scale = 2)
    private java.math.BigDecimal purchasePrice;

    /** MISMO AttachmentType: Attached | Detached. Form dropdown values match. */
    @Column(name = "attachment_type", length = 50)
    private String attachmentType;

    /**
     * MISMO ProjectLegalStructureType: Condominium | PUD | Cooperative | None.
     * Drives downstream behavior (HOA dues lookup, condo questionnaire, etc.).
     */
    @Column(name = "project_type", length = 50)
    private String projectType;

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

    public java.math.BigDecimal getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(java.math.BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }

    public String getAttachmentType() { return attachmentType; }
    public void setAttachmentType(String attachmentType) { this.attachmentType = attachmentType; }

    public String getProjectType() { return projectType; }
    public void setProjectType(String projectType) { this.projectType = projectType; }

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
        if (addressLine == null && city == null && state == null && zipCode == null) {
            return null;
        }
        
        StringBuilder address = new StringBuilder();
        if (addressLine != null) {
            address.append(addressLine);
        }
        if (city != null) {
            if (address.length() > 0) address.append(", ");
            address.append(city);
        }
        if (state != null) {
            if (address.length() > 0) address.append(", ");
            address.append(state);
        }
        if (zipCode != null) {
            if (address.length() > 0) address.append(" ");
            address.append(zipCode);
        }
        return address.length() > 0 ? address.toString() : null;
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
