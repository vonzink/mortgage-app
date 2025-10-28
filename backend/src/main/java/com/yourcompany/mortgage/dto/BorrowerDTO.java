package com.yourcompany.mortgage.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public class BorrowerDTO {
    
    private Integer sequenceNumber;
    
    @NotBlank(message = "First name is required")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    private String lastName;
    
    private String ssn;
    
    private LocalDate birthDate;
    
    private String maritalStatus;
    
    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;
    
    @NotBlank(message = "Phone is required")
    private String phone;
    
    private String citizenshipType;
    
    private Integer dependentsCount = 0;
    
    private List<EmploymentDTO> employmentHistory;
    
    private List<IncomeSourceDTO> incomeSources;
    
    private List<ResidenceDTO> residences;
    
    private List<REOPropertyDTO> reoProperties;
    
    private List<AssetDTO> assets;
    
    private DeclarationDTO declaration;
    
    // Current address fields
    private String currentAddressLine;
    private String currentCity;
    private String currentState;
    private String currentZipCode;
    
    // Constructors
    public BorrowerDTO() {}
    
    public BorrowerDTO(Integer sequenceNumber, String firstName, String lastName, String ssn, LocalDate birthDate) {
        this.sequenceNumber = sequenceNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.ssn = ssn;
        this.birthDate = birthDate;
    }
    
    // Getters and Setters
    public Integer getSequenceNumber() {
        return sequenceNumber;
    }
    
    public void setSequenceNumber(Integer sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }
    
    public String getFirstName() {
        return firstName;
    }
    
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    
    public String getLastName() {
        return lastName;
    }
    
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    
    public String getSsn() {
        return ssn;
    }
    
    public void setSsn(String ssn) {
        this.ssn = ssn;
    }
    
    public LocalDate getBirthDate() {
        return birthDate;
    }
    
    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }
    
    public String getMaritalStatus() {
        return maritalStatus;
    }
    
    public void setMaritalStatus(String maritalStatus) {
        this.maritalStatus = maritalStatus;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public String getCitizenshipType() {
        return citizenshipType;
    }
    
    public void setCitizenshipType(String citizenshipType) {
        this.citizenshipType = citizenshipType;
    }
    
    public Integer getDependentsCount() {
        return dependentsCount;
    }
    
    public void setDependentsCount(Integer dependentsCount) {
        this.dependentsCount = dependentsCount;
    }
    
    public List<EmploymentDTO> getEmploymentHistory() {
        return employmentHistory;
    }
    
    public void setEmploymentHistory(List<EmploymentDTO> employmentHistory) {
        this.employmentHistory = employmentHistory;
    }
    
    public List<IncomeSourceDTO> getIncomeSources() {
        return incomeSources;
    }
    
    public void setIncomeSources(List<IncomeSourceDTO> incomeSources) {
        this.incomeSources = incomeSources;
    }
    
    public List<ResidenceDTO> getResidences() {
        return residences;
    }
    
    public void setResidences(List<ResidenceDTO> residences) {
        this.residences = residences;
    }
    
    public DeclarationDTO getDeclaration() {
        return declaration;
    }
    
    public void setDeclaration(DeclarationDTO declaration) {
        this.declaration = declaration;
    }
    
    public List<REOPropertyDTO> getReoProperties() {
        return reoProperties;
    }
    
    public void setReoProperties(List<REOPropertyDTO> reoProperties) {
        this.reoProperties = reoProperties;
    }
    
    public List<AssetDTO> getAssets() {
        return assets;
    }
    
    public void setAssets(List<AssetDTO> assets) {
        this.assets = assets;
    }
    
    public String getCurrentAddressLine() {
        return currentAddressLine;
    }
    
    public void setCurrentAddressLine(String currentAddressLine) {
        this.currentAddressLine = currentAddressLine;
    }
    
    public String getCurrentCity() {
        return currentCity;
    }
    
    public void setCurrentCity(String currentCity) {
        this.currentCity = currentCity;
    }
    
    public String getCurrentState() {
        return currentState;
    }
    
    public void setCurrentState(String currentState) {
        this.currentState = currentState;
    }
    
    public String getCurrentZipCode() {
        return currentZipCode;
    }
    
    public void setCurrentZipCode(String currentZipCode) {
        this.currentZipCode = currentZipCode;
    }
    
    // Utility method to get full current address
    public String getFullCurrentAddress() {
        if (currentAddressLine == null) return null;
        
        StringBuilder address = new StringBuilder(currentAddressLine);
        if (currentCity != null) address.append(", ").append(currentCity);
        if (currentState != null) address.append(", ").append(currentState);
        if (currentZipCode != null) address.append(" ").append(currentZipCode);
        
        return address.toString();
    }
}
