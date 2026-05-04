package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One itemized closing fee. fee_type is free-text per the user's spec — LOs name fees
 * however they want (Origination, Processing, Underwriting, Appraisal, Title, etc.).
 */
@Entity
@Table(name = "closing_fees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClosingFee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_application_id", nullable = false)
    private LoanApplication application;

    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    @Column(name = "fee_type", length = 100)
    private String feeType;

    @Column(name = "fee_amount", precision = 15, scale = 2)
    private BigDecimal feeAmount;

    @Column(name = "paid_to")
    private String paidTo;

    @Column(name = "paid_by", length = 50)
    private String paidBy;          // Borrower | Seller | Lender | Other

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
