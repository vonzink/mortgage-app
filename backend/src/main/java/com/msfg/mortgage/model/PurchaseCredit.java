package com.msfg.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One non-borrower credit toward closing — earnest money, seller credit,
 * lender credit, etc. Mirrors a row in MISMO {@code DEAL/LOAN/PURCHASE_CREDITS}.
 * Free-text {@code source} captures who's giving the money when it's not
 * obvious from {@code creditType}.
 */
@Entity
@Table(name = "purchase_credits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseCredit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "credit_type", nullable = false, length = 64)
    private String creditType;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "source", length = 255)
    private String source;

    @Column(name = "notes", length = 500)
    private String notes;

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
