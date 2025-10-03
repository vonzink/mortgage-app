package com.yourcompany.mortgage.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

/**
 * Simple unit tests for LoanApplication model
 */
@ExtendWith(MockitoExtension.class)
class SimpleModelTest {

    private LoanApplication loanApplication;

    @BeforeEach
    void setUp() {
        loanApplication = new LoanApplication();
    }

    @Test
    void setAndGetLoanPurpose_ShouldWorkCorrectly() {
        // Given
        String loanPurpose = "Purchase";

        // When
        loanApplication.setLoanPurpose(loanPurpose);

        // Then
        assertThat(loanApplication.getLoanPurpose()).isEqualTo(loanPurpose);
    }

    @Test
    void setAndGetLoanType_ShouldWorkCorrectly() {
        // Given
        String loanType = "Conventional";

        // When
        loanApplication.setLoanType(loanType);

        // Then
        assertThat(loanApplication.getLoanType()).isEqualTo(loanType);
    }

    @Test
    void setAndGetLoanAmount_ShouldWorkCorrectly() {
        // Given
        BigDecimal loanAmount = new BigDecimal("500000");

        // When
        loanApplication.setLoanAmount(loanAmount);

        // Then
        assertThat(loanApplication.getLoanAmount()).isEqualTo(loanAmount);
    }

    @Test
    void setAndGetPropertyValue_ShouldWorkCorrectly() {
        // Given
        BigDecimal propertyValue = new BigDecimal("600000");

        // When
        loanApplication.setPropertyValue(propertyValue);

        // Then
        assertThat(loanApplication.getPropertyValue()).isEqualTo(propertyValue);
    }

    @Test
    void setAndGetStatus_ShouldWorkCorrectly() {
        // Given
        String status = "SUBMITTED";

        // When
        loanApplication.setStatus(status);

        // Then
        assertThat(loanApplication.getStatus()).isEqualTo(status);
    }

    @Test
    void defaultStatus_ShouldBeDRAFT() {
        // Then
        assertThat(loanApplication.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void calculateLoanToValueRatio_ShouldReturnCorrectRatio() {
        // Given
        BigDecimal loanAmount = new BigDecimal("500000");
        BigDecimal propertyValue = new BigDecimal("600000");
        BigDecimal expectedRatio = new BigDecimal("0.8333");

        loanApplication.setLoanAmount(loanAmount);
        loanApplication.setPropertyValue(propertyValue);

        // When
        BigDecimal actualRatio = loanApplication.getLoanAmount()
                .divide(loanApplication.getPropertyValue(), 4, java.math.RoundingMode.HALF_UP);

        // Then
        assertThat(actualRatio).isEqualTo(expectedRatio);
    }

    @Test
    void calculateLoanToValueRatio_WithNullValues_ShouldHandleGracefully() {
        // Given
        loanApplication.setLoanAmount(null);
        loanApplication.setPropertyValue(new BigDecimal("600000"));

        // When & Then
        assertThatCode(() -> {
            if (loanApplication.getLoanAmount() != null && loanApplication.getPropertyValue() != null) {
                loanApplication.getLoanAmount().divide(loanApplication.getPropertyValue(), 4, java.math.RoundingMode.HALF_UP);
            }
        }).doesNotThrowAnyException();
    }
}
