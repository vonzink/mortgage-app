package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;

public class PropertyDTO {
    
    private String addressLine;
    
    private String city;
    
    private String state;
    
    private String zipCode;
    
    private String county;
    
    private String propertyType;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Property value must be greater than 0")
    private BigDecimal propertyValue;
    
    private String constructionType;
    
    private Integer yearBuilt;
    
    private Integer unitsCount = 1;
    
    // Constructors
    public PropertyDTO() {}
    
    public PropertyDTO(String addressLine, String city, String state, String zipCode, String propertyType, BigDecimal propertyValue) {
        this.addressLine = addressLine;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.propertyType = propertyType;
        this.propertyValue = propertyValue;
    }
    
    // Getters and Setters
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
}
