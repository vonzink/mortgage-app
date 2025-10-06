package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "borrowers")
public class Borrower {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    @JsonBackReference
    private LoanApplication application;

    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "ssn")
    private String ssn;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "marital_status")
    private String maritalStatus;

    @Column(name = "email")
    private String email;

    @Column(name = "phone")
    private String phone;

    @Column(name = "citizenship_type")
    private String citizenshipType;

    @Column(name = "dependents_count")
    private Integer dependentsCount = 0;

    @OneToMany(mappedBy = "borrower", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Employment> employmentHistory = new ArrayList<>();

    @OneToMany(mappedBy = "borrower", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<IncomeSource> incomeSources = new ArrayList<>();

    @OneToMany(mappedBy = "borrower", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Residence> residences = new ArrayList<>();

    @OneToMany(mappedBy = "borrower", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<REOProperty> reoProperties = new ArrayList<>();

    @OneToOne(mappedBy = "borrower", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonManagedReference
    private Declaration declaration;

    @Column(name = "current_address_line")
    private String currentAddressLine;

    @Column(name = "current_city")
    private String currentCity;

    @Column(name = "current_state")
    private String currentState;

    @Column(name = "current_zip_code")
    private String currentZipCode;

    public Borrower() {}

    public Borrower(LoanApplication application, Integer sequenceNumber, String firstName, String lastName) {
        this.application = application;
        this.sequenceNumber = sequenceNumber;
        this.firstName = firstName;
        this.lastName = lastName;
    }

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

    public List<Employment> getEmploymentHistory() {
        return employmentHistory;
    }

    public void setEmploymentHistory(List<Employment> employmentHistory) {
        this.employmentHistory = employmentHistory;
    }

    public List<IncomeSource> getIncomeSources() {
        return incomeSources;
    }

    public void setIncomeSources(List<IncomeSource> incomeSources) {
        this.incomeSources = incomeSources;
    }

    public List<Residence> getResidences() {
        return residences;
    }

    public void setResidences(List<Residence> residences) {
        this.residences = residences;
    }

    public Declaration getDeclaration() {
        return declaration;
    }

    public void setDeclaration(Declaration declaration) {
        this.declaration = declaration;
    }

    public List<REOProperty> getReoProperties() {
        return reoProperties;
    }

    public void setReoProperties(List<REOProperty> reoProperties) {
        this.reoProperties = reoProperties;
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

    public String getFullCurrentAddress() {
        if (currentAddressLine == null) return null;

        StringBuilder address = new StringBuilder(currentAddressLine);
        if (currentCity != null) address.append(", ").append(currentCity);
        if (currentState != null) address.append(", ").append(currentState);
        if (currentZipCode != null) address.append(" ").append(currentZipCode);

        return address.toString();
    }
}
