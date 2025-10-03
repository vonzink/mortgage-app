package com.yourcompany.mortgage.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for LiabilityOptimized entity
 */
@ExtendWith(MockitoExtension.class)
class LiabilityOptimizedTest {

    private LiabilityOptimized liability;
    private LoanApplication application;
    private Borrower borrower;

    @BeforeEach
    void setUp() {
        application = new LoanApplication();
        application.setId(1L);
        application.setApplicationNumber("APP123");

        borrower = new Borrower();
        borrower.setId(1L);
        borrower.setFirstName("John");
        borrower.setLastName("Doe");

        liability = LiabilityOptimized.builder()
                .id(1L)
                .application(application)
                .borrower(borrower)
                .accountNumber("123456789")
                .creditorName("Test Bank")
                .liabilityType(LiabilityOptimized.LiabilityType.CREDIT_CARD)
                .monthlyPayment(new BigDecimal("250.00"))
                .unpaidBalance(new BigDecimal("5000.00"))
                .payoffStatus(false)
                .toBePaidOff(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getDebtToIncomeRatio_WithValidIncome_ShouldReturnCorrectRatio() {
        // Given
        BigDecimal monthlyIncome = new BigDecimal("5000.00");
        BigDecimal expectedRatio = new BigDecimal("0.0500"); // 250/5000 = 0.05

        // When
        BigDecimal actualRatio = liability.getDebtToIncomeRatio(monthlyIncome);

        // Then
        assertThat(actualRatio).isEqualTo(expectedRatio);
    }

    @Test
    void getDebtToIncomeRatio_WithZeroIncome_ShouldReturnZero() {
        // Given
        BigDecimal zeroIncome = BigDecimal.ZERO;

        // When
        BigDecimal ratio = liability.getDebtToIncomeRatio(zeroIncome);

        // Then
        assertThat(ratio).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void getDebtToIncomeRatio_WithNullIncome_ShouldReturnZero() {
        // When
        BigDecimal ratio = liability.getDebtToIncomeRatio(null);

        // Then
        assertThat(ratio).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void isRevolving_WithCreditCard_ShouldReturnTrue() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.CREDIT_CARD);

        // When
        boolean isRevolving = liability.isRevolving();

        // Then
        assertThat(isRevolving).isTrue();
    }

    @Test
    void isRevolving_WithRevolvingType_ShouldReturnTrue() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.REVOLVING);

        // When
        boolean isRevolving = liability.isRevolving();

        // Then
        assertThat(isRevolving).isTrue();
    }

    @Test
    void isRevolving_WithAutoLoan_ShouldReturnFalse() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.AUTO_LOAN);

        // When
        boolean isRevolving = liability.isRevolving();

        // Then
        assertThat(isRevolving).isFalse();
    }

    @Test
    void isMortgage_WithMortgageLoan_ShouldReturnTrue() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.MORTGAGE_LOAN);

        // When
        boolean isMortgage = liability.isMortgage();

        // Then
        assertThat(isMortgage).isTrue();
    }

    @Test
    void isMortgage_WithCreditCard_ShouldReturnFalse() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.CREDIT_CARD);

        // When
        boolean isMortgage = liability.isMortgage();

        // Then
        assertThat(isMortgage).isFalse();
    }

    @Test
    void isConsumerDebt_WithCreditCard_ShouldReturnTrue() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.CREDIT_CARD);

        // When
        boolean isConsumerDebt = liability.isConsumerDebt();

        // Then
        assertThat(isConsumerDebt).isTrue();
    }

    @Test
    void isConsumerDebt_WithAutoLoan_ShouldReturnTrue() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.AUTO_LOAN);

        // When
        boolean isConsumerDebt = liability.isConsumerDebt();

        // Then
        assertThat(isConsumerDebt).isTrue();
    }

    @Test
    void isConsumerDebt_WithInstallment_ShouldReturnTrue() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.INSTALLMENT);

        // When
        boolean isConsumerDebt = liability.isConsumerDebt();

        // Then
        assertThat(isConsumerDebt).isTrue();
    }

    @Test
    void isConsumerDebt_WithStudentLoan_ShouldReturnFalse() {
        // Given
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.STUDENT_LOAN);

        // When
        boolean isConsumerDebt = liability.isConsumerDebt();

        // Then
        assertThat(isConsumerDebt).isFalse();
    }

    @Test
    void getMaskedAccountNumber_WithValidAccountNumber_ShouldReturnMaskedNumber() {
        // Given
        liability.setAccountNumber("1234567890");

        // When
        String maskedNumber = liability.getMaskedAccountNumber();

        // Then
        assertThat(maskedNumber).isEqualTo("****7890");
    }

    @Test
    void getMaskedAccountNumber_WithShortAccountNumber_ShouldReturnOriginalNumber() {
        // Given
        liability.setAccountNumber("123");

        // When
        String maskedNumber = liability.getMaskedAccountNumber();

        // Then
        assertThat(maskedNumber).isEqualTo("123");
    }

    @Test
    void getMaskedAccountNumber_WithNullAccountNumber_ShouldReturnNull() {
        // Given
        liability.setAccountNumber(null);

        // When
        String maskedNumber = liability.getMaskedAccountNumber();

        // Then
        assertThat(maskedNumber).isNull();
    }

    @Test
    void getTotalLiabilityImpact_WithValidValues_ShouldReturnCorrectImpact() {
        // Given
        BigDecimal monthlyPayment = new BigDecimal("250.00");
        BigDecimal unpaidBalance = new BigDecimal("12000.00"); // 12000/12 = 1000 monthly impact
        BigDecimal expectedImpact = new BigDecimal("1250.00"); // 250 + 1000

        liability.setMonthlyPayment(monthlyPayment);
        liability.setUnpaidBalance(unpaidBalance);

        // When
        BigDecimal actualImpact = liability.getTotalLiabilityImpact();

        // Then
        assertThat(actualImpact).isEqualTo(expectedImpact);
    }

    @Test
    void getTotalLiabilityImpact_WithNullValues_ShouldReturnZero() {
        // Given
        liability.setMonthlyPayment(null);
        liability.setUnpaidBalance(null);

        // When
        BigDecimal impact = liability.getTotalLiabilityImpact();

        // Then
        assertThat(impact).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void shouldIncludeInDTI_WithPaidOffLiability_ShouldReturnFalse() {
        // Given
        liability.setPayoffStatus(true);
        liability.setMonthlyPayment(new BigDecimal("250.00"));

        // When
        boolean shouldInclude = liability.shouldIncludeInDTI();

        // Then
        assertThat(shouldInclude).isFalse();
    }

    @Test
    void shouldIncludeInDTI_WithZeroPayment_ShouldReturnFalse() {
        // Given
        liability.setPayoffStatus(false);
        liability.setMonthlyPayment(BigDecimal.ZERO);

        // When
        boolean shouldInclude = liability.shouldIncludeInDTI();

        // Then
        assertThat(shouldInclude).isFalse();
    }

    @Test
    void shouldIncludeInDTI_WithValidPayment_ShouldReturnTrue() {
        // Given
        liability.setPayoffStatus(false);
        liability.setMonthlyPayment(new BigDecimal("250.00"));

        // When
        boolean shouldInclude = liability.shouldIncludeInDTI();

        // Then
        assertThat(shouldInclude).isTrue();
    }

    @Test
    void getPayoffPriority_WithPaidOffLiability_ShouldReturnZero() {
        // Given
        liability.setPayoffStatus(true);

        // When
        int priority = liability.getPayoffPriority();

        // Then
        assertThat(priority).isZero();
    }

    @Test
    void getPayoffPriority_WithCreditCard_ShouldReturnHighestPriority() {
        // Given
        liability.setPayoffStatus(false);
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.CREDIT_CARD);

        // When
        int priority = liability.getPayoffPriority();

        // Then
        assertThat(priority).isEqualTo(1);
    }

    @Test
    void getPayoffPriority_WithAutoLoan_ShouldReturnMediumPriority() {
        // Given
        liability.setPayoffStatus(false);
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.AUTO_LOAN);

        // When
        int priority = liability.getPayoffPriority();

        // Then
        assertThat(priority).isEqualTo(3);
    }

    @Test
    void getPayoffPriority_WithMortgageLoan_ShouldReturnLowestPriority() {
        // Given
        liability.setPayoffStatus(false);
        liability.setLiabilityType(LiabilityOptimized.LiabilityType.MORTGAGE_LOAN);

        // When
        int priority = liability.getPayoffPriority();

        // Then
        assertThat(priority).isEqualTo(6);
    }

    @Test
    void liabilityTypeEnum_ShouldHaveCorrectDisplayNames() {
        // Then
        assertThat(LiabilityOptimized.LiabilityType.MORTGAGE_LOAN.getDisplayName()).isEqualTo("Mortgage Loan");
        assertThat(LiabilityOptimized.LiabilityType.REVOLVING.getDisplayName()).isEqualTo("Revolving");
        assertThat(LiabilityOptimized.LiabilityType.INSTALLMENT.getDisplayName()).isEqualTo("Installment");
        assertThat(LiabilityOptimized.LiabilityType.STUDENT_LOAN.getDisplayName()).isEqualTo("Student Loan");
        assertThat(LiabilityOptimized.LiabilityType.AUTO_LOAN.getDisplayName()).isEqualTo("Auto Loan");
        assertThat(LiabilityOptimized.LiabilityType.CREDIT_CARD.getDisplayName()).isEqualTo("Credit Card");
        assertThat(LiabilityOptimized.LiabilityType.OTHER.getDisplayName()).isEqualTo("Other");
    }

    @Test
    void builder_ShouldCreateLiabilityWithAllFields() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        Long id = 1L;

        // When
        LiabilityOptimized builtLiability = LiabilityOptimized.builder()
                .id(id)
                .application(application)
                .borrower(borrower)
                .accountNumber("987654321")
                .creditorName("Test Credit Union")
                .liabilityType(LiabilityOptimized.LiabilityType.AUTO_LOAN)
                .monthlyPayment(new BigDecimal("350.00"))
                .unpaidBalance(new BigDecimal("15000.00"))
                .payoffStatus(true)
                .toBePaidOff(false)
                .createdAt(now)
                .updatedAt(now)
                .build();

        // Then
        assertThat(builtLiability.getId()).isEqualTo(id);
        assertThat(builtLiability.getApplication()).isEqualTo(application);
        assertThat(builtLiability.getBorrower()).isEqualTo(borrower);
        assertThat(builtLiability.getAccountNumber()).isEqualTo("987654321");
        assertThat(builtLiability.getCreditorName()).isEqualTo("Test Credit Union");
        assertThat(builtLiability.getLiabilityType()).isEqualTo(LiabilityOptimized.LiabilityType.AUTO_LOAN);
        assertThat(builtLiability.getMonthlyPayment()).isEqualTo(new BigDecimal("350.00"));
        assertThat(builtLiability.getUnpaidBalance()).isEqualTo(new BigDecimal("15000.00"));
        assertThat(builtLiability.getPayoffStatus()).isTrue();
        assertThat(builtLiability.getToBePaidOff()).isFalse();
        assertThat(builtLiability.getCreatedAt()).isEqualTo(now);
        assertThat(builtLiability.getUpdatedAt()).isEqualTo(now);
    }

    @Test
    void equalsAndHashCode_ShouldWorkCorrectly() {
        // Given
        LiabilityOptimized liability1 = LiabilityOptimized.builder()
                .id(1L)
                .creditorName("Test Bank")
                .build();

        LiabilityOptimized liability2 = LiabilityOptimized.builder()
                .id(1L)
                .creditorName("Different Bank")
                .build();

        LiabilityOptimized liability3 = LiabilityOptimized.builder()
                .id(2L)
                .creditorName("Test Bank")
                .build();

        // Then
        assertThat(liability1).isEqualTo(liability2); // Same ID
        assertThat(liability1).isNotEqualTo(liability3); // Different ID
        assertThat(liability1.hashCode()).isEqualTo(liability2.hashCode());
        assertThat(liability1.hashCode()).isNotEqualTo(liability3.hashCode());
    }
}
