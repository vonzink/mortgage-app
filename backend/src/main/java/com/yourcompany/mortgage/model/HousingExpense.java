package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One proposed/present housing expense for a loan — a single line item in the
 * Loan Dashboard's PITIA breakdown. MISMO imports the {@code HOUSING_EXPENSES}
 * block as one row per type per loan.
 *
 * <p>The {@code expense_type} string mirrors MISMO's {@code HousingExpenseType}
 * enum verbatim ({@code FirstMortgagePrincipalAndInterest}, {@code RealEstateTax},
 * {@code MIPremium}, {@code HomeownersAssociationDuesAndCondominiumFees}, etc.).
 * Stored as VARCHAR rather than a Java enum so unfamiliar types from future
 * MISMO updates flow through without a migration.
 */
@Entity
@Table(name = "housing_expenses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HousingExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "expense_type", nullable = false, length = 64)
    private String expenseType;

    /** MISMO {@code HousingExpenseTimingType}: Proposed (this loan) | Present (current). */
    @Column(name = "timing_type", length = 20)
    private String timingType;

    @Column(name = "payment_amount", precision = 12, scale = 2)
    private BigDecimal paymentAmount;

    /** Preserves the order MISMO presented the rows in. */
    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
