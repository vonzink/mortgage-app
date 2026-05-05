package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * LO-side loan terms — the "this loan" row that the Loan Dashboard renders.
 *
 * <p>Distinct from {@link LoanApplication} (which holds the borrower-facing 1003
 * surface) because these fields are owned by the loan officer / processor and
 * change over the life of the loan: rate quoted, term agreed, amortization
 * type, lien priority, etc. MISMO imports populate them initially; the LO
 * edits them as terms firm up.
 */
@Entity
@Table(name = "loan_terms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanTerms {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 1:1 with the loan application; UNIQUE in the DB. */
    @Column(name = "application_id", nullable = false, unique = true)
    private Long applicationId;

    @Column(name = "base_loan_amount", precision = 15, scale = 2)
    private BigDecimal baseLoanAmount;

    @Column(name = "note_amount", precision = 15, scale = 2)
    private BigDecimal noteAmount;

    /** 4 decimal places preserves quoted precision (e.g. 6.3750). */
    @Column(name = "note_rate_percent", precision = 7, scale = 4)
    private BigDecimal noteRatePercent;

    /** MISMO {@code AmortizationType}: Fixed, AdjustableRate, etc. */
    @Column(name = "amortization_type", length = 50)
    private String amortizationType;

    /** Loan term in months. 360 = 30-year, 180 = 15-year, etc. */
    @Column(name = "amortization_term_months")
    private Integer amortizationTermMonths;

    /** MISMO {@code LienPriorityType}: FirstLien, SecondLien, ThirdLien. */
    @Column(name = "lien_priority_type", length = 50)
    private String lienPriorityType;

    @Column(name = "application_received_date")
    private LocalDate applicationReceivedDate;

    /**
     * Down payment toward closing. When MISMO doesn't supply it directly we compute
     * {@code propertyValue - baseLoanAmount} on import. Editable on the dashboard.
     */
    @Column(name = "down_payment_amount", precision = 15, scale = 2)
    private BigDecimal downPaymentAmount;

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
