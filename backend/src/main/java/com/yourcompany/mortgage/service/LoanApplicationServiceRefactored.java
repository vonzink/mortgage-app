package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.mapper.LoanApplicationMapper;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Refactored LoanApplicationService with improved structure and error handling
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class LoanApplicationServiceRefactored implements BaseService<LoanApplication, Long> {
    
    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanApplicationMapper loanApplicationMapper;
    
    /**
     * Create a new loan application
     */
    @Override
    @Transactional
    public LoanApplication create(LoanApplication entity) {
        log.info("Creating new loan application");
        validateLoanApplication(entity);
        
        LoanApplication savedApplication = loanApplicationRepository.save(entity);
        log.info("Successfully created loan application with ID: {}", savedApplication.getId());
        
        return savedApplication;
    }
    
    /**
     * Create loan application from DTO
     */
    @Transactional
    public LoanApplication createFromDTO(LoanApplicationDTO applicationDTO) {
        log.info("Creating loan application from DTO");
        
        LoanApplication application = loanApplicationMapper.toEntity(applicationDTO);
        return create(application);
    }
    
    /**
     * Update an existing loan application
     */
    @Override
    @Transactional
    public LoanApplication update(Long id, LoanApplication entity) {
        log.info("Updating loan application with ID: {}", id);
        
        LoanApplication existingApplication = findByIdOrThrow(id);
        
        // Update fields
        existingApplication.setLoanPurpose(entity.getLoanPurpose());
        existingApplication.setLoanType(entity.getLoanType());
        existingApplication.setLoanAmount(entity.getLoanAmount());
        existingApplication.setPropertyValue(entity.getPropertyValue());
        existingApplication.setStatus(entity.getStatus());
        
        validateLoanApplication(existingApplication);
        
        LoanApplication savedApplication = loanApplicationRepository.save(existingApplication);
        log.info("Successfully updated loan application with ID: {}", id);
        
        return savedApplication;
    }
    
    /**
     * Update loan application from DTO
     */
    @Transactional
    public LoanApplication updateFromDTO(Long id, LoanApplicationDTO applicationDTO) {
        log.info("Updating loan application from DTO with ID: {}", id);
        
        LoanApplication existingApplication = findByIdOrThrow(id);
        LoanApplication updatedApplication = loanApplicationMapper.toEntity(applicationDTO);
        updatedApplication.setId(id);
        
        return update(id, updatedApplication);
    }
    
    /**
     * Update application status
     */
    @Transactional
    public LoanApplication updateStatus(Long id, String status) {
        log.info("Updating application status for ID: {} to status: {}", id, status);
        
        LoanApplication application = findByIdOrThrow(id);
        application.setStatus(status);
        
        LoanApplication savedApplication = loanApplicationRepository.save(application);
        log.info("Successfully updated application status for ID: {}", id);
        
        return savedApplication;
    }
    
    /**
     * Find loan application by ID
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<LoanApplication> findById(Long id) {
        log.debug("Finding loan application by ID: {}", id);
        return loanApplicationRepository.findById(id);
    }
    
    /**
     * Find loan application by ID or throw exception
     */
    @Transactional(readOnly = true)
    public LoanApplication findByIdOrThrow(Long id) {
        return findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loan application not found with ID: " + id));
    }
    
    /**
     * Find loan application by application number
     */
    @Transactional(readOnly = true)
    public Optional<LoanApplication> findByApplicationNumber(String applicationNumber) {
        log.debug("Finding loan application by number: {}", applicationNumber);
        return loanApplicationRepository.findByApplicationNumber(applicationNumber);
    }
    
    /**
     * Find loan applications by status
     */
    @Transactional(readOnly = true)
    public List<LoanApplication> findByStatus(String status) {
        log.debug("Finding loan applications by status: {}", status);
        return loanApplicationRepository.findByStatus(status);
    }
    
    /**
     * Find all loan applications
     */
    @Override
    @Transactional(readOnly = true)
    public List<LoanApplication> findAll() {
        log.debug("Finding all loan applications");
        return loanApplicationRepository.findAll();
    }
    
    /**
     * Find all loan applications with pagination
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanApplication> findAll(Pageable pageable) {
        log.debug("Finding all loan applications with pagination");
        return loanApplicationRepository.findAll(pageable);
    }
    
    /**
     * Delete loan application by ID
     */
    @Override
    @Transactional
    public void deleteById(Long id) {
        log.info("Deleting loan application with ID: {}", id);
        
        if (!existsById(id)) {
            throw new ResourceNotFoundException("Loan application not found with ID: " + id);
        }
        
        loanApplicationRepository.deleteById(id);
        log.info("Successfully deleted loan application with ID: {}", id);
    }
    
    /**
     * Check if loan application exists by ID
     */
    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Long id) {
        return loanApplicationRepository.existsById(id);
    }
    
    /**
     * Count all loan applications
     */
    @Override
    @Transactional(readOnly = true)
    public long count() {
        return loanApplicationRepository.count();
    }
    
    /**
     * Validate loan application data
     */
    private void validateLoanApplication(LoanApplication application) {
        if (application.getLoanPurpose() == null || application.getLoanPurpose().trim().isEmpty()) {
            throw new IllegalArgumentException("Loan purpose is required");
        }
        
        if (application.getLoanType() == null || application.getLoanType().trim().isEmpty()) {
            throw new IllegalArgumentException("Loan type is required");
        }
        
        if (application.getLoanAmount() == null || application.getLoanAmount().doubleValue() <= 0) {
            throw new IllegalArgumentException("Loan amount must be greater than 0");
        }
        
        if (application.getPropertyValue() == null || application.getPropertyValue().doubleValue() <= 0) {
            throw new IllegalArgumentException("Property value must be greater than 0");
        }
        
        log.debug("Loan application validation passed");
    }
}
