package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByLoanIdOrderByCreatedAtDesc(Long loanId, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.entityType = :entityType AND a.entityId = :entityId "
            + "ORDER BY a.createdAt DESC")
    List<AuditLog> findByEntity(@Param("entityType") String entityType,
                                @Param("entityId") Long entityId);

    @Query("SELECT a FROM AuditLog a WHERE a.loanId = :loanId AND a.action = :action "
            + "ORDER BY a.createdAt DESC")
    List<AuditLog> findByLoanIdAndAction(@Param("loanId") Long loanId,
                                          @Param("action") String action);

    @Query("SELECT a FROM AuditLog a WHERE a.loanId = :loanId "
            + "AND (:entityType IS NULL OR a.entityType = :entityType) "
            + "AND (:action IS NULL OR a.action = :action) "
            + "ORDER BY a.createdAt DESC")
    Page<AuditLog> findFiltered(@Param("loanId") Long loanId,
                                 @Param("entityType") String entityType,
                                 @Param("action") String action,
                                 Pageable pageable);
}
