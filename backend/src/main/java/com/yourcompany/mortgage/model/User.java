package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Local user record — materialized from a Cognito JWT on first sign-in. Mirrors the
 * dashboard's pattern (see {@code dashboard.msfgco.com/backend/db/migrations/}).
 *
 * <p>Identity stays in Cognito; this row is just the local handle so we can foreign-key
 * loan/borrower/agent assignments and audit who-did-what without round-tripping to AWS.
 */
@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String email;

    private String name;

    private String initials;

    /** borrower | agent | lo | processor | manager | admin (lower-case). */
    @Column(nullable = false)
    private String role;

    @Column(name = "cognito_sub", unique = true)
    private String cognitoSub;

    /** Mirrors a single Cognito group; if the user is in multiple, we record the most specific. */
    @Column(name = "cognito_group")
    private String cognitoGroup;

    private String phone;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (role == null) role = "borrower";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
