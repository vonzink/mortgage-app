package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import com.yourcompany.mortgage.mapper.LoanApplicationMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Simple unit tests for LoanApplicationServiceRefactored
 */
@ExtendWith(MockitoExtension.class)
class SimpleServiceTest {

    @Mock
    private LoanApplicationRepository loanApplicationRepository;

    @Mock
    private LoanApplicationMapper loanApplicationMapper;

    @InjectMocks
    private LoanApplicationServiceRefactored loanApplicationService;

    private LoanApplication testApplication;
    private LoanApplicationDTO testApplicationDTO;

    @BeforeEach
    void setUp() {
        testApplication = new LoanApplication();
        testApplication.setId(1L);
        testApplication.setLoanPurpose("Purchase");
        testApplication.setLoanType("Conventional");
        testApplication.setLoanAmount(new BigDecimal("500000"));
        testApplication.setPropertyValue(new BigDecimal("600000"));
        testApplication.setStatus("DRAFT");

        testApplicationDTO = new LoanApplicationDTO();
        testApplicationDTO.setLoanPurpose("Purchase");
        testApplicationDTO.setLoanType("Conventional");
        testApplicationDTO.setLoanAmount(new BigDecimal("500000"));
        testApplicationDTO.setPropertyValue(new BigDecimal("600000"));
        testApplicationDTO.setStatus("DRAFT");
    }

    @Test
    void findById_WithExistingId_ShouldReturnApplication() {
        // Given
        Long applicationId = 1L;
        when(loanApplicationRepository.findById(applicationId)).thenReturn(Optional.of(testApplication));

        // When
        Optional<LoanApplication> result = loanApplicationService.findById(applicationId);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(testApplication);
        verify(loanApplicationRepository).findById(applicationId);
    }

    @Test
    void findById_WithNonExistingId_ShouldReturnEmpty() {
        // Given
        Long applicationId = 999L;
        when(loanApplicationRepository.findById(applicationId)).thenReturn(Optional.empty());

        // When
        Optional<LoanApplication> result = loanApplicationService.findById(applicationId);

        // Then
        assertThat(result).isEmpty();
        verify(loanApplicationRepository).findById(applicationId);
    }

    @Test
    void existsById_WithExistingId_ShouldReturnTrue() {
        // Given
        Long applicationId = 1L;
        when(loanApplicationRepository.existsById(applicationId)).thenReturn(true);

        // When
        boolean result = loanApplicationService.existsById(applicationId);

        // Then
        assertThat(result).isTrue();
        verify(loanApplicationRepository).existsById(applicationId);
    }

    @Test
    void count_ShouldReturnApplicationCount() {
        // Given
        long expectedCount = 5L;
        when(loanApplicationRepository.count()).thenReturn(expectedCount);

        // When
        long result = loanApplicationService.count();

        // Then
        assertThat(result).isEqualTo(expectedCount);
        verify(loanApplicationRepository).count();
    }
}
