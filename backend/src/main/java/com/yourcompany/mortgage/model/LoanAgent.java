package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Real-estate agent attached to a loan. Mirrors the {@code loan_agents} table created in
 * V3 — each row links a {@link User} (the agent) to a {@link LoanApplication} via a role
 * (BuyersAgent / ListingAgent / DualAgent). Multiple agents per loan are supported.
 *
 * <p>The Closing & Fees step manages these inline (add / edit / remove). Phase 3's LO
 * dashboard will also surface them.
 */
@Entity
@Table(name = "loan_agents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_application_id", nullable = false)
    private LoanApplication application;

    /** Agents are first-class users so they can later sign in to the agent portal. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User agentUser;

    @Column(name = "agent_role", nullable = false, length = 50)
    @Builder.Default
    private String agentRole = "BuyersAgent";  // BuyersAgent | ListingAgent | DualAgent

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "assigned_by")
    private Integer assignedByUserId;

    @PrePersist
    protected void onCreate() {
        if (assignedAt == null) assignedAt = LocalDateTime.now();
    }
}
