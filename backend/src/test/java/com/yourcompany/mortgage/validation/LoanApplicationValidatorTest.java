package com.yourcompany.mortgage.validation;

import com.yourcompany.mortgage.dto.BorrowerDTO;
import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.dto.PropertyDTO;
import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for LoanApplicationValidator
 */
@ExtendWith(MockitoExtension.class)
class LoanApplicationValidatorTest {

    @Mock
    private ConstraintValidatorContext context;

    @Mock
    private ConstraintValidatorContext.ConstraintViolationBuilder violationBuilder;

    @Mock
    private ConstraintValidatorContext.ConstraintViolationBuilder.NodeBuilderCustomizableContext nodeBuilder;

    private LoanApplicationValidator validator;
    private LoanApplicationDTO validApplication;

    @BeforeEach
    void setUp() {
        validator = new LoanApplicationValidator();
        validApplication = createValidLoanApplicationDTO();

        // Setup mock context with lenient stubbing
        lenient().doNothing().when(context).disableDefaultConstraintViolation();
        lenient().doReturn(violationBuilder).when(context).buildConstraintViolationWithTemplate(anyString());
        lenient().doReturn(nodeBuilder).when(violationBuilder).addPropertyNode(anyString());
        lenient().doReturn(context).when(nodeBuilder).addConstraintViolation();
    }

    @Test
    void isValid_WithValidApplication_ShouldReturnTrue() {
        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isTrue();
        verify(context, never()).disableDefaultConstraintViolation();
    }

    @Test
    void isValid_WithLoanAmountExceedingPropertyValue_ShouldReturnFalse() {
        // Given
        validApplication.setLoanAmount(new BigDecimal("700000")); // Exceeds property value
        validApplication.setPropertyValue(new BigDecimal("600000"));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
        verify(violationBuilder, atLeastOnce()).addPropertyNode("loanAmount");
        verify(nodeBuilder, atLeastOnce()).addConstraintViolation();
    }

    @Test
    void isValid_WithLoanAmountEqualToPropertyValue_ShouldReturnTrue() {
        // Given
        validApplication.setLoanAmount(new BigDecimal("600000"));
        validApplication.setPropertyValue(new BigDecimal("600000"));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void isValid_WithLTVRatioExceeding100Percent_ShouldReturnFalse() {
        // Given
        validApplication.setLoanAmount(new BigDecimal("600000"));
        validApplication.setPropertyValue(new BigDecimal("500000")); // LTV = 120%

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
        verify(violationBuilder, atLeastOnce()).addPropertyNode("loanAmount");
        verify(nodeBuilder, atLeastOnce()).addConstraintViolation();
    }

    @Test
    void isValid_WithLTVRatioAt100Percent_ShouldReturnTrue() {
        // Given
        validApplication.setLoanAmount(new BigDecimal("600000"));
        validApplication.setPropertyValue(new BigDecimal("600000")); // LTV = 100%

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void isValid_WithDuplicateBorrowerSSNs_ShouldReturnFalse() {
        // Given
        BorrowerDTO borrower1 = createValidBorrowerDTO();
        borrower1.setSsn("123-45-6789");

        BorrowerDTO borrower2 = createValidBorrowerDTO();
        borrower2.setSsn("123-45-6789"); // Same SSN

        validApplication.setBorrowers(Arrays.asList(borrower1, borrower2));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
        verify(violationBuilder).addPropertyNode("borrowers[1].ssn");
        verify(nodeBuilder, atLeastOnce()).addConstraintViolation();
    }

    @Test
    void isValid_WithUniqueBorrowerSSNs_ShouldReturnTrue() {
        // Given
        BorrowerDTO borrower1 = createValidBorrowerDTO();
        borrower1.setSsn("123-45-6789");

        BorrowerDTO borrower2 = createValidBorrowerDTO();
        borrower2.setSsn("987-65-4321"); // Different SSN

        validApplication.setBorrowers(Arrays.asList(borrower1, borrower2));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void isValid_WithNoBorrowers_ShouldReturnFalse() {
        // Given
        validApplication.setBorrowers(Collections.emptyList());

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
        verify(violationBuilder).addPropertyNode("borrowers");
        verify(nodeBuilder, atLeastOnce()).addConstraintViolation();
    }

    @Test
    void isValid_WithNullBorrowers_ShouldReturnFalse() {
        // Given
        validApplication.setBorrowers(null);

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
        verify(violationBuilder).addPropertyNode("borrowers");
        verify(nodeBuilder, atLeastOnce()).addConstraintViolation();
    }

    @Test
    void isValid_WithNoValidBorrower_ShouldReturnFalse() {
        // Given
        BorrowerDTO invalidBorrower = new BorrowerDTO();
        invalidBorrower.setFirstName(""); // Invalid
        invalidBorrower.setLastName(""); // Invalid
        invalidBorrower.setSsn(""); // Invalid

        validApplication.setBorrowers(Arrays.asList(invalidBorrower));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
        verify(violationBuilder).addPropertyNode("borrowers");
        verify(nodeBuilder, atLeastOnce()).addConstraintViolation();
    }

    @Test
    void isValid_WithPartialValidBorrower_ShouldReturnTrue() {
        // Given
        BorrowerDTO partialBorrower = new BorrowerDTO();
        partialBorrower.setFirstName("John");
        partialBorrower.setLastName("Doe");
        partialBorrower.setSsn("123-45-6789");
        // Missing other fields but has required ones

        validApplication.setBorrowers(Arrays.asList(partialBorrower));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void isValid_WithNullProperty_ShouldReturnFalse() {
        // Given
        validApplication.setProperty(null);

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
        verify(violationBuilder).addPropertyNode("property");
        verify(nodeBuilder, atLeastOnce()).addConstraintViolation();
    }

    @Test
    void isValid_WithNullLoanAmount_ShouldNotCauseException() {
        // Given
        validApplication.setLoanAmount(null);
        validApplication.setPropertyValue(new BigDecimal("600000"));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        // Should not throw exception, validation should handle null gracefully
        assertThat(result).isTrue(); // Other validations pass
    }

    @Test
    void isValid_WithNullPropertyValue_ShouldNotCauseException() {
        // Given
        validApplication.setLoanAmount(new BigDecimal("500000"));
        validApplication.setPropertyValue(null);

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        // Should not throw exception, validation should handle null gracefully
        assertThat(result).isTrue(); // Other validations pass
    }

    @Test
    void isValid_WithMultipleValidationErrors_ShouldReturnFalse() {
        // Given
        validApplication.setLoanAmount(new BigDecimal("700000")); // Exceeds property value
        validApplication.setPropertyValue(new BigDecimal("600000"));
        
        BorrowerDTO borrower1 = createValidBorrowerDTO();
        borrower1.setSsn("123-45-6789");

        BorrowerDTO borrower2 = createValidBorrowerDTO();
        borrower2.setSsn("123-45-6789"); // Duplicate SSN

        validApplication.setBorrowers(Arrays.asList(borrower1, borrower2));

        // When
        boolean result = validator.isValid(validApplication, context);

        // Then
        assertThat(result).isFalse();
        // Should trigger multiple constraint violations
        verify(context, atLeastOnce()).disableDefaultConstraintViolation();
    }

    private LoanApplicationDTO createValidLoanApplicationDTO() {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose("Purchase");
        dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("500000"));
        dto.setPropertyValue(new BigDecimal("600000"));
        dto.setStatus("DRAFT");

        // Add property
        PropertyDTO property = new PropertyDTO();
        property.setAddressLine("123 Main St");
        property.setCity("Anytown");
        property.setState("CA");
        property.setZipCode("12345");
        property.setPropertyType("SingleFamily");
        property.setPropertyValue(new BigDecimal("600000"));
        dto.setProperty(property);

        // Add borrowers
        BorrowerDTO borrower = createValidBorrowerDTO();
        dto.setBorrowers(Arrays.asList(borrower));

        return dto;
    }

    private BorrowerDTO createValidBorrowerDTO() {
        BorrowerDTO borrower = new BorrowerDTO();
        borrower.setSequenceNumber(1);
        borrower.setFirstName("John");
        borrower.setLastName("Doe");
        borrower.setSsn("123-45-6789");
        borrower.setEmail("john.doe@email.com");
        borrower.setPhone("555-123-4567");
        borrower.setMaritalStatus("Single");
        borrower.setCitizenshipType("USCitizen");
        borrower.setDependentsCount(0);
        return borrower;
    }
}
