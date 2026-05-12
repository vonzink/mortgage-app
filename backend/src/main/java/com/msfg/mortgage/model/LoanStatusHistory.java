package com.msfg.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Append-only audit row for every loan status transition. Created by
 * {@code LoanApplicationService.updateApplicationStatus}; never modified afterwards.
 *
 * <p>Mirrors the table created in {@code V2__loan_status_history.sql}.
 */
@Entity
@Table(name = "loan_status_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "loan_application_id", nullable = false)
    private Long loanApplicationId;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "transitioned_at", nullable = false)
    private LocalDateTime transitionedAt;

    /** Null when the system made the change (e.g., automated job). */
    @Column(name = "transitioned_by_user_id")
    private Integer transitionedByUserId;

    @Column(name = "note", length = 1000)
    private String note;

    @PrePersist
    protected void onCreate() {
        if (transitionedAt == null) {
            transitionedAt = LocalDateTime.now();
        }
    }
}
