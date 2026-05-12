package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.ResidenceDTO;
import com.msfg.mortgage.model.Residence;
import com.msfg.mortgage.model.Borrower;
import com.msfg.mortgage.repository.ResidenceRepository;
import com.msfg.mortgage.repository.BorrowerRepository;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.exception.BusinessValidationException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ResidenceService {

    private final ResidenceRepository residenceRepository;
    private final BorrowerRepository borrowerRepository;
    
    public List<ResidenceDTO> getResidencesByBorrower(Long borrowerId) {
        log.info("Getting residences for borrower ID: {}", borrowerId);
        
        List<Residence> residences = residenceRepository.findByBorrowerId(borrowerId);
        
        return residences.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public ResidenceDTO getResidenceById(Long residenceId) {
        log.info("Getting residence by ID: {}", residenceId);
        
        Residence residence = residenceRepository.findById(residenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Residence not found with ID: " + residenceId));
        
        return convertToDTO(residence);
    }
    
    public ResidenceDTO createResidence(Long borrowerId, ResidenceDTO residenceDTO) {
        log.info("Creating residence for borrower ID: {}", borrowerId);
        
        Borrower borrower = borrowerRepository.findById(borrowerId)
                .orElseThrow(() -> new ResourceNotFoundException("Borrower not found with ID: " + borrowerId));
        
        validateResidenceData(residenceDTO, borrowerId);
        
        Residence residence = convertToEntity(residenceDTO);
        residence.setBorrower(borrower);
        
        Residence savedResidence = residenceRepository.save(residence);
        log.info("Created residence with ID: {}", savedResidence.getId());
        
        return convertToDTO(savedResidence);
    }
    
    public ResidenceDTO updateResidence(Long residenceId, ResidenceDTO residenceDTO) {
        log.info("Updating residence with ID: {}", residenceId);
        
        Residence existingResidence = residenceRepository.findById(residenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Residence not found with ID: " + residenceId));
        
        validateResidenceData(residenceDTO, existingResidence.getBorrower().getId());
        
        updateResidenceFields(existingResidence, residenceDTO);
        
        Residence savedResidence = residenceRepository.save(existingResidence);
        log.info("Updated residence with ID: {}", savedResidence.getId());
        
        return convertToDTO(savedResidence);
    }
    
    public void deleteResidence(Long residenceId) {
        log.info("Deleting residence with ID: {}", residenceId);
        
        Residence residence = residenceRepository.findById(residenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Residence not found with ID: " + residenceId));
        
        residenceRepository.delete(residence);
        log.info("Deleted residence with ID: {}", residenceId);
    }
    
    public ResidenceDTO getCurrentResidence(Long borrowerId) {
        log.info("Getting current residence for borrower ID: {}", borrowerId);
        
        List<Residence> currentResidences = residenceRepository.findByBorrowerIdAndResidencyType(borrowerId, "Current");
        
        if (currentResidences.isEmpty()) {
            throw new ResourceNotFoundException("No current residence found for borrower ID: " + borrowerId);
        }
        
        if (currentResidences.size() > 1) {
            log.warn("Multiple current residences found for borrower ID: {}", borrowerId);
        }
        
        return convertToDTO(currentResidences.get(0));
    }
    
    public List<ResidenceDTO> getPriorResidences(Long borrowerId) {
        log.info("Getting prior residences for borrower ID: {}", borrowerId);
        
        List<Residence> priorResidences = residenceRepository.findByBorrowerIdAndResidencyType(borrowerId, "Prior");
        
        return priorResidences.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public BigDecimal getTotalHousingCost(Long borrowerId) {
        log.info("Calculating total housing cost for borrower ID: {}", borrowerId);
        
        List<Residence> residences = residenceRepository.findByBorrowerId(borrowerId);
        
        return residences.stream()
                .filter(residence -> "Rent".equals(residence.getResidencyBasis()) && 
                                   residence.getMonthlyRent() != null)
                .map(Residence::getMonthlyRent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    public int getTotalResidenceHistory(Long borrowerId) {
        log.info("Calculating total residence history for borrower ID: {}", borrowerId);
        
        List<Residence> residences = residenceRepository.findByBorrowerId(borrowerId);
        
        return residences.stream()
                .mapToInt(residence -> residence.getDurationMonths() != null ? residence.getDurationMonths() : 0)
                .sum();
    }
    
    // Private helper methods
    private void validateResidenceData(ResidenceDTO residenceDTO, Long borrowerId) {
        // Validate that rent amount is provided for rental properties
        if ("Rent".equals(residenceDTO.getResidencyBasis())) {
            if (residenceDTO.getMonthlyRent() == null || residenceDTO.getMonthlyRent().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessValidationException("Monthly rent is required and must be greater than zero for rental properties");
            }
        } else if ("Own".equals(residenceDTO.getResidencyBasis()) || "LivingRentFree".equals(residenceDTO.getResidencyBasis())) {
            // For owned properties or living rent-free, rent should be null or zero
            if (residenceDTO.getMonthlyRent() != null && residenceDTO.getMonthlyRent().compareTo(BigDecimal.ZERO) > 0) {
                log.warn("Monthly rent provided for non-rental property, setting to zero");
                residenceDTO.setMonthlyRent(BigDecimal.ZERO);
            }
        }
        
        // Validate that only one current residence exists
        if ("Current".equals(residenceDTO.getResidencyType())) {
            List<Residence> existingCurrentResidences = residenceRepository.findByBorrowerIdAndResidencyType(borrowerId, "Current");
            if (!existingCurrentResidences.isEmpty()) {
                throw new BusinessValidationException("Borrower can only have one current residence");
            }
        }
        
        // Validate duration
        if (residenceDTO.getDurationMonths() != null && residenceDTO.getDurationMonths() <= 0) {
            throw new BusinessValidationException("Duration in months must be greater than zero");
        }
    }
    
    private void updateResidenceFields(Residence residence, ResidenceDTO dto) {
        residence.setAddressLine(dto.getAddressLine());
        residence.setCity(dto.getCity());
        residence.setState(dto.getState());
        residence.setZipCode(dto.getZipCode());
        residence.setResidencyType(dto.getResidencyType());
        residence.setResidencyBasis(dto.getResidencyBasis());
        residence.setDurationMonths(dto.getDurationMonths());
        residence.setMonthlyRent(dto.getMonthlyRent());
    }
    
    private ResidenceDTO convertToDTO(Residence residence) {
        ResidenceDTO dto = new ResidenceDTO();
        dto.setId(residence.getId());
        dto.setAddressLine(residence.getAddressLine());
        dto.setCity(residence.getCity());
        dto.setState(residence.getState());
        dto.setZipCode(residence.getZipCode());
        dto.setResidencyType(residence.getResidencyType());
        dto.setResidencyBasis(residence.getResidencyBasis());
        dto.setDurationMonths(residence.getDurationMonths());
        dto.setMonthlyRent(residence.getMonthlyRent());
        dto.setBorrowerId(residence.getBorrower().getId());
        dto.computeDerivedFields();
        
        return dto;
    }
    
    private Residence convertToEntity(ResidenceDTO dto) {
        Residence residence = new Residence();
        residence.setAddressLine(dto.getAddressLine());
        residence.setCity(dto.getCity());
        residence.setState(dto.getState());
        residence.setZipCode(dto.getZipCode());
        residence.setResidencyType(dto.getResidencyType());
        residence.setResidencyBasis(dto.getResidencyBasis());
        residence.setDurationMonths(dto.getDurationMonths());
        residence.setMonthlyRent(dto.getMonthlyRent());
        
        return residence;
    }
}
