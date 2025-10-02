package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.IncomeSourceDTO;
import com.yourcompany.mortgage.model.IncomeSource;
import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.repository.IncomeSourceRepository;
import com.yourcompany.mortgage.repository.BorrowerRepository;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.exception.BusinessValidationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class IncomeSourceService {
    
    private static final Logger logger = LoggerFactory.getLogger(IncomeSourceService.class);
    
    @Autowired
    private IncomeSourceRepository incomeSourceRepository;
    
    @Autowired
    private BorrowerRepository borrowerRepository;
    
    public List<IncomeSourceDTO> getIncomeSourcesByBorrower(Long borrowerId) {
        logger.info("Getting income sources for borrower ID: {}", borrowerId);
        
        List<IncomeSource> incomeSources = incomeSourceRepository.findByBorrowerId(borrowerId);
        
        return incomeSources.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public IncomeSourceDTO getIncomeSourceById(Long incomeSourceId) {
        logger.info("Getting income source by ID: {}", incomeSourceId);
        
        IncomeSource incomeSource = incomeSourceRepository.findById(incomeSourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Income source not found with ID: " + incomeSourceId));
        
        return convertToDTO(incomeSource);
    }
    
    public IncomeSourceDTO createIncomeSource(Long borrowerId, IncomeSourceDTO incomeSourceDTO) {
        logger.info("Creating income source for borrower ID: {}", borrowerId);
        
        Borrower borrower = borrowerRepository.findById(borrowerId)
                .orElseThrow(() -> new ResourceNotFoundException("Borrower not found with ID: " + borrowerId));
        
        validateIncomeSourceData(incomeSourceDTO);
        
        IncomeSource incomeSource = convertToEntity(incomeSourceDTO);
        incomeSource.setBorrower(borrower);
        
        IncomeSource savedIncomeSource = incomeSourceRepository.save(incomeSource);
        logger.info("Created income source with ID: {}", savedIncomeSource.getId());
        
        return convertToDTO(savedIncomeSource);
    }
    
    public IncomeSourceDTO updateIncomeSource(Long incomeSourceId, IncomeSourceDTO incomeSourceDTO) {
        logger.info("Updating income source with ID: {}", incomeSourceId);
        
        IncomeSource existingIncomeSource = incomeSourceRepository.findById(incomeSourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Income source not found with ID: " + incomeSourceId));
        
        validateIncomeSourceData(incomeSourceDTO);
        
        updateIncomeSourceFields(existingIncomeSource, incomeSourceDTO);
        
        IncomeSource savedIncomeSource = incomeSourceRepository.save(existingIncomeSource);
        logger.info("Updated income source with ID: {}", savedIncomeSource.getId());
        
        return convertToDTO(savedIncomeSource);
    }
    
    public void deleteIncomeSource(Long incomeSourceId) {
        logger.info("Deleting income source with ID: {}", incomeSourceId);
        
        IncomeSource incomeSource = incomeSourceRepository.findById(incomeSourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Income source not found with ID: " + incomeSourceId));
        
        incomeSourceRepository.delete(incomeSource);
        logger.info("Deleted income source with ID: {}", incomeSourceId);
    }
    
    public BigDecimal getTotalAdditionalMonthlyIncome(Long borrowerId) {
        logger.info("Calculating total additional monthly income for borrower ID: {}", borrowerId);
        
        List<IncomeSource> incomeSources = incomeSourceRepository.findByBorrowerId(borrowerId);
        
        return incomeSources.stream()
                .map(IncomeSource::getMonthlyAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    public BigDecimal getTotalAdditionalAnnualIncome(Long borrowerId) {
        return getTotalAdditionalMonthlyIncome(borrowerId).multiply(BigDecimal.valueOf(12));
    }
    
    public List<IncomeSourceDTO> getGovernmentBenefits(Long borrowerId) {
        logger.info("Getting government benefits for borrower ID: {}", borrowerId);
        
        return getIncomeSourcesByBorrower(borrowerId).stream()
                .filter(dto -> dto.getIsGovernmentBenefit())
                .collect(Collectors.toList());
    }
    
    public List<IncomeSourceDTO> getInvestmentIncome(Long borrowerId) {
        logger.info("Getting investment income for borrower ID: {}", borrowerId);
        
        return getIncomeSourcesByBorrower(borrowerId).stream()
                .filter(dto -> dto.getIsInvestmentIncome())
                .collect(Collectors.toList());
    }
    
    // Private helper methods
    private void validateIncomeSourceData(IncomeSourceDTO incomeSourceDTO) {
        if (incomeSourceDTO.getMonthlyAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Monthly amount must be greater than zero");
        }
        
        // Add specific validation for certain income types
        if ("Other".equals(incomeSourceDTO.getIncomeType()) && 
            (incomeSourceDTO.getDescription() == null || incomeSourceDTO.getDescription().trim().isEmpty())) {
            throw new BusinessValidationException("Description is required for 'Other' income type");
        }
    }
    
    private void updateIncomeSourceFields(IncomeSource incomeSource, IncomeSourceDTO dto) {
        incomeSource.setIncomeType(dto.getIncomeType());
        incomeSource.setMonthlyAmount(dto.getMonthlyAmount());
        incomeSource.setDescription(dto.getDescription());
    }
    
    private IncomeSourceDTO convertToDTO(IncomeSource incomeSource) {
        IncomeSourceDTO dto = new IncomeSourceDTO();
        dto.setId(incomeSource.getId());
        dto.setIncomeType(incomeSource.getIncomeType());
        dto.setMonthlyAmount(incomeSource.getMonthlyAmount());
        dto.setDescription(incomeSource.getDescription());
        dto.computeDerivedFields();
        
        return dto;
    }
    
    private IncomeSource convertToEntity(IncomeSourceDTO dto) {
        IncomeSource incomeSource = new IncomeSource();
        incomeSource.setIncomeType(dto.getIncomeType());
        incomeSource.setMonthlyAmount(dto.getMonthlyAmount());
        incomeSource.setDescription(dto.getDescription());
        
        return incomeSource;
    }
}
