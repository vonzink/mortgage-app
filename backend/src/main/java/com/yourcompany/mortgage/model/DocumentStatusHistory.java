package com.yourcompany.mortgage.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_status_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "transitioned_at", nullable = false)
    private LocalDateTime transitionedAt;

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
