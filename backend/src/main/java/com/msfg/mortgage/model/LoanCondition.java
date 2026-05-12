package com.msfg.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One UW condition tracked on the Loan Dashboard. The condition's life cycle is
 * Outstanding → Cleared (or Waived). {@link #conditionType} buckets it for the
 * processor's worklist (PriorToDocs / PriorToFunding / AtClosing / PostClose).
 *
 * <p>Status, due_date, assigned_to_user_id, cleared_at, and cleared_by_user_id
 * are all editable from the dashboard; the importer doesn't populate this table
 * (conditions come from the LO/UW, not the URLA).
 */
@Entity
@Table(name = "loan_conditions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanCondition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "condition_text", nullable = false, length = 2000)
    private String conditionText;

    /** PriorToDocs | PriorToFunding | AtClosing | PostClose | Other. */
    @Column(name = "condition_type", length = 50)
    private String conditionType;

    /** Outstanding | Cleared | Waived. */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "assigned_to_user_id")
    private Long assignedToUserId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "cleared_at")
    private LocalDateTime clearedAt;

    @Column(name = "cleared_by_user_id")
    private Long clearedByUserId;

    @Column(name = "notes", length = 2000)
    private String notes;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = "Outstanding";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
