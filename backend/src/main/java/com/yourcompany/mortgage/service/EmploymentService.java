package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.EmploymentDTO;
import com.yourcompany.mortgage.exception.BusinessValidationException;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.Employment;
import com.yourcompany.mortgage.repository.BorrowerRepository;
import com.yourcompany.mortgage.repository.EmploymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class EmploymentService {

    private static final Logger logger = LoggerFactory.getLogger(EmploymentService.class);

    @Autowired
    private EmploymentRepository employmentRepository;

    @Autowired
    private BorrowerRepository borrowerRepository;

    @Transactional(readOnly = true)
    public List<EmploymentDTO> getEmploymentsByBorrower(Long borrowerId) {
        logger.info("Getting employments for borrower ID: {}", borrowerId);
        List<Employment> employments = employmentRepository.findByBorrowerIdOrderBySequenceNumber(borrowerId);
        return employments.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Employment getEmploymentEntityById(Long employmentId) {
        logger.info("Getting employment entity by ID: {}", employmentId);
        return employmentRepository.findById(employmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Employment not found with ID: " + employmentId));
    }

    @Transactional(readOnly = true)
    public EmploymentDTO getEmploymentById(Long employmentId) {
        return convertToDTO(getEmploymentEntityById(employmentId));
    }

    public EmploymentDTO createEmployment(Long borrowerId, EmploymentDTO employmentDTO) {
        logger.info("Creating employment for borrower ID: {}", borrowerId);

        Borrower borrower = borrowerRepository.findById(borrowerId)
                .orElseThrow(() -> new ResourceNotFoundException("Borrower not found with ID: " + borrowerId));

        validateEmploymentData(employmentDTO);
        validateSequenceNumber(borrowerId, employmentDTO.getSequenceNumber(), null);

        Employment employment = convertToEntity(employmentDTO);
        employment.setBorrower(borrower);

        Employment savedEmployment = employmentRepository.save(employment);
        logger.info("Created employment with ID: {}", savedEmployment.getId());

        return convertToDTO(savedEmployment);
    }

    public EmploymentDTO updateEmployment(Long employmentId, EmploymentDTO employmentDTO) {
        logger.info("Updating employment with ID: {}", employmentId);

        Employment existingEmployment = employmentRepository.findById(employmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Employment not found with ID: " + employmentId));

        validateEmploymentData(employmentDTO);
        validateSequenceNumber(existingEmployment.getBorrower().getId(), employmentDTO.getSequenceNumber(), employmentId);

        updateEmploymentFields(existingEmployment, employmentDTO);

        Employment savedEmployment = employmentRepository.save(existingEmployment);
        logger.info("Updated employment with ID: {}", savedEmployment.getId());

        return convertToDTO(savedEmployment);
    }

    public void deleteEmployment(Long employmentId) {
        logger.info("Deleting employment with ID: {}", employmentId);

        Employment employment = employmentRepository.findById(employmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Employment not found with ID: " + employmentId));

        employmentRepository.delete(employment);
        logger.info("Deleted employment with ID: {}", employmentId);
    }

    @Transactional(readOnly = true)
    public List<EmploymentDTO> getCurrentEmployments(Long borrowerId) {
        logger.info("Getting current employments for borrower ID: {}", borrowerId);
        List<Employment> employments = employmentRepository.findCurrentEmploymentByBorrowerId(borrowerId);
        return employments.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalMonthlyIncome(Long borrowerId) {
        logger.info("Calculating total monthly income for borrower ID: {}", borrowerId);
        List<Employment> currentEmployments = employmentRepository.findCurrentEmploymentByBorrowerId(borrowerId);
        return currentEmployments.stream()
                .map(Employment::getMonthlyIncome)
                .filter(x -> x != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalAnnualIncome(Long borrowerId) {
        return getTotalMonthlyIncome(borrowerId).multiply(BigDecimal.valueOf(12));
    }

    // Private helper methods
    private void validateEmploymentData(EmploymentDTO employmentDTO) {
        if (employmentDTO.getStartDate() != null && employmentDTO.getEndDate() != null &&
                employmentDTO.getStartDate().isAfter(employmentDTO.getEndDate())) {
            throw new BusinessValidationException("Start date cannot be after end date");
        }

        if ("Current".equals(employmentDTO.getEmploymentStatus()) && employmentDTO.getEndDate() != null) {
            throw new BusinessValidationException("Current employment cannot have an end date");
        }

        if ("Previous".equals(employmentDTO.getEmploymentStatus()) && employmentDTO.getEndDate() == null) {
            throw new BusinessValidationException("Previous employment must have an end date");
        }
    }

    private void validateSequenceNumber(Long borrowerId, Integer sequenceNumber, Long excludeEmploymentId) {
        List<Employment> existingEmployments = employmentRepository.findByBorrowerIdOrderBySequenceNumber(borrowerId);

        boolean sequenceExists = existingEmployments.stream()
                .anyMatch(emp -> emp.getSequenceNumber().equals(sequenceNumber)
                        && (excludeEmploymentId == null || !emp.getId().equals(excludeEmploymentId)));

        if (sequenceExists) {
            throw new BusinessValidationException("Sequence number " + sequenceNumber + " already exists for this borrower");
        }
    }

    private void updateEmploymentFields(Employment employment, EmploymentDTO dto) {
        employment.setSequenceNumber(dto.getSequenceNumber());
        employment.setEmployerName(dto.getEmployerName());
        employment.setPosition(dto.getPosition());
        employment.setEmployerPhone(dto.getEmployerPhone());
        employment.setEmployerAddress(dto.getEmployerAddress());
        employment.setEmployerCity(dto.getEmployerCity());
        employment.setEmployerState(dto.getEmployerState());
        employment.setEmployerZip(dto.getEmployerZip());
        employment.setStartDate(dto.getStartDate());
        employment.setEndDate(dto.getEndDate());
        employment.setMonthlyIncome(dto.getMonthlyIncome());
        employment.setEmploymentStatus(dto.getEmploymentStatus());
        employment.setSelfEmployed(dto.getSelfEmployed() != null ? dto.getSelfEmployed() : Boolean.FALSE);
    }

    private EmploymentDTO convertToDTO(Employment employment) {
        EmploymentDTO dto = new EmploymentDTO();
        dto.setSequenceNumber(employment.getSequenceNumber());
        dto.setEmployerName(employment.getEmployerName());
        dto.setPosition(employment.getPosition());
        dto.setEmployerPhone(employment.getEmployerPhone());
        dto.setEmployerAddress(employment.getEmployerAddress());
        dto.setEmployerCity(employment.getEmployerCity());
        dto.setEmployerState(employment.getEmployerState());
        dto.setEmployerZip(employment.getEmployerZip());
        dto.setStartDate(employment.getStartDate());
        dto.setEndDate(employment.getEndDate());
        dto.setMonthlyIncome(employment.getMonthlyIncome());
        dto.setEmploymentStatus(employment.getEmploymentStatus());
        dto.setSelfEmployed(employment.getSelfEmployed());
        return dto;
    }

    private Employment convertToEntity(EmploymentDTO dto) {
        Employment employment = new Employment();
        employment.setSequenceNumber(dto.getSequenceNumber());
        employment.setEmployerName(dto.getEmployerName());
        employment.setPosition(dto.getPosition());
        employment.setEmployerPhone(dto.getEmployerPhone());
        employment.setEmployerAddress(dto.getEmployerAddress());
        employment.setEmployerCity(dto.getEmployerCity());
        employment.setEmployerState(dto.getEmployerState());
        employment.setEmployerZip(dto.getEmployerZip());
        employment.setStartDate(dto.getStartDate());
        employment.setEndDate(dto.getEndDate());
        employment.setMonthlyIncome(dto.getMonthlyIncome());
        employment.setEmploymentStatus(dto.getEmploymentStatus());
        employment.setSelfEmployed(dto.getSelfEmployed() != null ? dto.getSelfEmployed() : Boolean.FALSE);
        return employment;
    }
}
