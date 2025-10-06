package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.*;
import com.yourcompany.mortgage.model.*;
import com.yourcompany.mortgage.repository.*;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class LoanApplicationService {
    
    @Autowired
    private LoanApplicationRepository loanApplicationRepository;
    
    @Autowired
    private BorrowerRepository borrowerRepository;
    
    @Autowired
    private PropertyRepository propertyRepository;
    
    @Autowired
    private EmploymentRepository employmentRepository;
    
    @Autowired
    private LiabilityRepository liabilityRepository;
    
    
    @Autowired
    private IncomeSourceRepository incomeSourceRepository;
    
    @Autowired
    private ResidenceRepository residenceRepository;
    
    public LoanApplication createApplication(LoanApplicationDTO applicationDTO) {
        // Create main application
        LoanApplication application = new LoanApplication();
        application.setLoanPurpose(applicationDTO.getLoanPurpose());
        application.setLoanType(applicationDTO.getLoanType());
        application.setLoanAmount(applicationDTO.getLoanAmount());
        application.setPropertyValue(applicationDTO.getPropertyValue());
        application.setStatus(applicationDTO.getStatus());
        
        application = loanApplicationRepository.save(application);
        final LoanApplication applicationRef = application;
        
        // Create property
        if (applicationDTO.getProperty() != null) {
            Property property = createProperty(applicationDTO.getProperty(), applicationRef);
            application.setProperty(property);
        }
        
        // Create borrowers
        if (applicationDTO.getBorrowers() != null && !applicationDTO.getBorrowers().isEmpty()) {
            List<Borrower> borrowers = applicationDTO.getBorrowers().stream()
                    .map(borrowerDTO -> createBorrower(borrowerDTO, applicationRef))
                    .collect(Collectors.toList());
            application.setBorrowers(borrowers);
        }
        
        // Create liabilities
        if (applicationDTO.getLiabilities() != null && !applicationDTO.getLiabilities().isEmpty()) {
            List<Liability> liabilities = applicationDTO.getLiabilities().stream()
                    .map(liabilityDTO -> createLiability(liabilityDTO, applicationRef))
                    .collect(Collectors.toList());
            application.setLiabilities(liabilities);
        }
        
        return application;
    }
    
    @Transactional(readOnly = true)
    public List<LoanApplication> getAllApplications() {
        return loanApplicationRepository.findAll();
    }
    
    @Transactional(readOnly = true)
    public Optional<LoanApplication> getApplicationById(Long id) {
        return loanApplicationRepository.findById(id);
    }
    
    @Transactional(readOnly = true)
    public Optional<LoanApplication> getApplicationByNumber(String applicationNumber) {
        return loanApplicationRepository.findByApplicationNumber(applicationNumber);
    }
    
    @Transactional(readOnly = true)
    public List<LoanApplication> getApplicationsByStatus(String status) {
        return loanApplicationRepository.findByStatus(status);
    }
    
    public LoanApplication updateApplication(Long id, LoanApplicationDTO applicationDTO) {
        LoanApplication application = loanApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        
        application.setLoanPurpose(applicationDTO.getLoanPurpose());
        application.setLoanType(applicationDTO.getLoanType());
        application.setLoanAmount(applicationDTO.getLoanAmount());
        application.setPropertyValue(applicationDTO.getPropertyValue());
        application.setStatus(applicationDTO.getStatus());
        
        return loanApplicationRepository.save(application);
    }
    
    public void deleteApplication(Long id) {
        loanApplicationRepository.deleteById(id);
    }
    
    public LoanApplication updateApplicationStatus(Long id, String status) {
        LoanApplication application = loanApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        
        application.setStatus(status);
        return loanApplicationRepository.save(application);
    }
    
    private Property createProperty(PropertyDTO propertyDTO, LoanApplication application) {
        Property property = new Property();
        property.setApplication(application);
        property.setAddressLine(propertyDTO.getAddressLine());
        property.setCity(propertyDTO.getCity());
        property.setState(propertyDTO.getState());
        property.setZipCode(propertyDTO.getZipCode());
        property.setCounty(propertyDTO.getCounty());
        property.setPropertyType(propertyDTO.getPropertyType());
        property.setPropertyValue(propertyDTO.getPropertyValue());
        property.setConstructionType(propertyDTO.getConstructionType());
        property.setYearBuilt(propertyDTO.getYearBuilt());
        property.setUnitsCount(propertyDTO.getUnitsCount());
        
        return propertyRepository.save(property);
    }
    
    private Borrower createBorrower(BorrowerDTO borrowerDTO, LoanApplication application) {
        Borrower borrower = new Borrower();
        borrower.setApplication(application);
        borrower.setSequenceNumber(borrowerDTO.getSequenceNumber());
        borrower.setFirstName(borrowerDTO.getFirstName());
        borrower.setLastName(borrowerDTO.getLastName());
        borrower.setSsn(borrowerDTO.getSsn()); // TODO: Implement SSN encryption
        borrower.setBirthDate(borrowerDTO.getBirthDate());
        borrower.setMaritalStatus(borrowerDTO.getMaritalStatus());
        borrower.setEmail(borrowerDTO.getEmail());
        borrower.setPhone(borrowerDTO.getPhone());
        borrower.setCitizenshipType(borrowerDTO.getCitizenshipType());
        borrower.setDependentsCount(borrowerDTO.getDependentsCount());
        
        borrower = borrowerRepository.save(borrower);
        final Borrower savedBorrower = borrower;
        
        // Create employment history
        if (borrowerDTO.getEmploymentHistory() != null && !borrowerDTO.getEmploymentHistory().isEmpty()) {
            List<Employment> employmentHistory = new java.util.ArrayList<>();
            for (EmploymentDTO employmentDTO : borrowerDTO.getEmploymentHistory()) {
                employmentHistory.add(createEmployment(employmentDTO, savedBorrower));
            }
            savedBorrower.setEmploymentHistory(employmentHistory);
        }
        
        // Create income sources
        if (borrowerDTO.getIncomeSources() != null && !borrowerDTO.getIncomeSources().isEmpty()) {
            List<IncomeSource> incomeSources = new java.util.ArrayList<>();
            for (IncomeSourceDTO incomeSourceDTO : borrowerDTO.getIncomeSources()) {
                incomeSources.add(createIncomeSource(incomeSourceDTO, savedBorrower));
            }
            savedBorrower.setIncomeSources(incomeSources);
        }
        
        // Create residences
        if (borrowerDTO.getResidences() != null && !borrowerDTO.getResidences().isEmpty()) {
            List<Residence> residences = new java.util.ArrayList<>();
            for (ResidenceDTO residenceDTO : borrowerDTO.getResidences()) {
                residences.add(createResidence(residenceDTO, savedBorrower));
            }
            savedBorrower.setResidences(residences);
        }
        
        // Create declaration
        if (borrowerDTO.getDeclaration() != null) {
            Declaration declaration = createDeclaration(borrowerDTO.getDeclaration(), savedBorrower);
            savedBorrower.setDeclaration(declaration);
        }
        
        return borrower;
    }
    
    private Employment createEmployment(EmploymentDTO employmentDTO, Borrower borrower) {
        Employment employment = new Employment();
        employment.setBorrower(borrower);
        employment.setSequenceNumber(employmentDTO.getSequenceNumber());
        employment.setEmployerName(employmentDTO.getEmployerName());
        employment.setPosition(employmentDTO.getPosition());
        employment.setEmployerPhone(employmentDTO.getEmployerPhone());
        employment.setEmployerAddress(employmentDTO.getEmployerAddress());
        employment.setEmployerCity(employmentDTO.getEmployerCity());
        employment.setEmployerState(employmentDTO.getEmployerState());
        employment.setEmployerZip(employmentDTO.getEmployerZip());
        employment.setStartDate(employmentDTO.getStartDate());
        employment.setEndDate(employmentDTO.getEndDate());
        employment.setMonthlyIncome(employmentDTO.getMonthlyIncome());
        employment.setEmploymentStatus(employmentDTO.getEmploymentStatus());
        employment.setSelfEmployed(employmentDTO.getSelfEmployed());
        
        return employmentRepository.save(employment);
    }
    
    private IncomeSource createIncomeSource(IncomeSourceDTO incomeSourceDTO, Borrower borrower) {
        IncomeSource incomeSource = new IncomeSource();
        incomeSource.setBorrower(borrower);
        incomeSource.setIncomeType(incomeSourceDTO.getIncomeType());
        incomeSource.setMonthlyAmount(incomeSourceDTO.getMonthlyAmount());
        incomeSource.setDescription(incomeSourceDTO.getDescription());
        
        return incomeSourceRepository.save(incomeSource);
    }
    
    private Residence createResidence(ResidenceDTO residenceDTO, Borrower borrower) {
        Residence residence = new Residence();
        residence.setBorrower(borrower);
        residence.setAddressLine(residenceDTO.getAddressLine());
        residence.setCity(residenceDTO.getCity());
        residence.setState(residenceDTO.getState());
        residence.setZipCode(residenceDTO.getZipCode());
        residence.setResidencyType(residenceDTO.getResidencyType());
        residence.setResidencyBasis(residenceDTO.getResidencyBasis());
        residence.setDurationMonths(residenceDTO.getDurationMonths());
        residence.setMonthlyRent(residenceDTO.getMonthlyRent());
        
        return residenceRepository.save(residence);
    }
    
    private Declaration createDeclaration(DeclarationDTO declarationDTO, Borrower borrower) {
        Declaration declaration = new Declaration();
        declaration.setBorrower(borrower);
        declaration.setOutstandingJudgments(declarationDTO.getOutstandingJudgments());
        declaration.setBankruptcy(declarationDTO.getBankruptcy());
        declaration.setForeclosure(declarationDTO.getForeclosure());
        declaration.setLawsuit(declarationDTO.getLawsuit());
        declaration.setLoanForeclosure(declarationDTO.getLoanForeclosure());
        declaration.setPresentlyDelinquent(declarationDTO.getPresentlyDelinquent());
        declaration.setAlimonyChildSupport(declarationDTO.getAlimonyChildSupport());
        declaration.setBorrowingDownPayment(declarationDTO.getBorrowingDownPayment());
        declaration.setComakerEndorser(declarationDTO.getComakerEndorser());
        declaration.setUsCitizen(declarationDTO.getUsCitizen());
        declaration.setPermanentResident(declarationDTO.getPermanentResident());
        declaration.setIntentToOccupy(declarationDTO.getIntentToOccupy());
        
        return declaration;
    }
    
    private Liability createLiability(LiabilityDTO liabilityDTO, LoanApplication application) {
        Liability liability = new Liability();
        liability.setApplication(application);
        liability.setAccountNumber(liabilityDTO.getAccountNumber());
        liability.setCreditorName(liabilityDTO.getCreditorName());
        liability.setLiabilityType(liabilityDTO.getLiabilityType());
        liability.setMonthlyPayment(liabilityDTO.getMonthlyPayment());
        liability.setUnpaidBalance(liabilityDTO.getUnpaidBalance());
        liability.setPayoffStatus(liabilityDTO.getPayoffStatus());
        liability.setToBePaidOff(liabilityDTO.getToBePaidOff());
        
        return liabilityRepository.save(liability);
    }
}
