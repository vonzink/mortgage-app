package com.yourcompany.mortgage.xml;

import jakarta.xml.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@XmlRootElement(name = "mortgageApplication")
@XmlAccessorType(XmlAccessType.FIELD)
public class MortgageApplicationXML {

    @XmlElement
    private Long id;

    @XmlElement
    private String propertyAddress;

    @XmlElement
    private String propertyCity;

    @XmlElement
    private String propertyState;

    @XmlElement
    private String propertyZip;

    @XmlElement
    private BigDecimal loanAmount;

    @XmlElement
    private BigDecimal downPayment;

    @XmlElement
    private BigDecimal annualIncome;

    @XmlElement
    private String employmentStatus;

    @XmlElement
    private Integer creditScore;

    @XmlElement
    private String applicationStatus;

    @XmlElement
    private LocalDateTime createdAt;

    @XmlElement
    private LocalDateTime updatedAt;

    // User information
    @XmlElement
    private String userFirstName;

    @XmlElement
    private String userLastName;

    @XmlElement
    private String userEmail;

    @XmlElement
    private String userPhone;

    // Constructors
    public MortgageApplicationXML() {}

    public MortgageApplicationXML(Long id, String propertyAddress, String propertyCity,
                                String propertyState, String propertyZip, BigDecimal loanAmount,
                                BigDecimal downPayment, BigDecimal annualIncome, String employmentStatus,
                                Integer creditScore, String applicationStatus, LocalDateTime createdAt,
                                LocalDateTime updatedAt, String userFirstName, String userLastName,
                                String userEmail, String userPhone) {
        this.id = id;
        this.propertyAddress = propertyAddress;
        this.propertyCity = propertyCity;
        this.propertyState = propertyState;
        this.propertyZip = propertyZip;
        this.loanAmount = loanAmount;
        this.downPayment = downPayment;
        this.annualIncome = annualIncome;
        this.employmentStatus = employmentStatus;
        this.creditScore = creditScore;
        this.applicationStatus = applicationStatus;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.userFirstName = userFirstName;
        this.userLastName = userLastName;
        this.userEmail = userEmail;
        this.userPhone = userPhone;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPropertyAddress() {
        return propertyAddress;
    }

    public void setPropertyAddress(String propertyAddress) {
        this.propertyAddress = propertyAddress;
    }

    public String getPropertyCity() {
        return propertyCity;
    }

    public void setPropertyCity(String propertyCity) {
        this.propertyCity = propertyCity;
    }

    public String getPropertyState() {
        return propertyState;
    }

    public void setPropertyState(String propertyState) {
        this.propertyState = propertyState;
    }

    public String getPropertyZip() {
        return propertyZip;
    }

    public void setPropertyZip(String propertyZip) {
        this.propertyZip = propertyZip;
    }

    public BigDecimal getLoanAmount() {
        return loanAmount;
    }

    public void setLoanAmount(BigDecimal loanAmount) {
        this.loanAmount = loanAmount;
    }

    public BigDecimal getDownPayment() {
        return downPayment;
    }

    public void setDownPayment(BigDecimal downPayment) {
        this.downPayment = downPayment;
    }

    public BigDecimal getAnnualIncome() {
        return annualIncome;
    }

    public void setAnnualIncome(BigDecimal annualIncome) {
        this.annualIncome = annualIncome;
    }

    public String getEmploymentStatus() {
        return employmentStatus;
    }

    public void setEmploymentStatus(String employmentStatus) {
        this.employmentStatus = employmentStatus;
    }

    public Integer getCreditScore() {
        return creditScore;
    }

    public void setCreditScore(Integer creditScore) {
        this.creditScore = creditScore;
    }

    public String getApplicationStatus() {
        return applicationStatus;
    }

    public void setApplicationStatus(String applicationStatus) {
        this.applicationStatus = applicationStatus;
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

    public String getUserFirstName() {
        return userFirstName;
    }

    public void setUserFirstName(String userFirstName) {
        this.userFirstName = userFirstName;
    }

    public String getUserLastName() {
        return userLastName;
    }

    public void setUserLastName(String userLastName) {
        this.userLastName = userLastName;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getUserPhone() {
        return userPhone;
    }

    public void setUserPhone(String userPhone) {
        this.userPhone = userPhone;
    }
}
