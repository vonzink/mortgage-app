package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.LoanCondition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanConditionRepository extends JpaRepository<LoanCondition, Long> {

    /**
     * Outstanding first, then by type bucket, then newest first within each bucket —
     * matches the LO worklist order on the dashboard.
     */
    @Query("SELECT c FROM LoanCondition c WHERE c.applicationId = :appId "
            + "ORDER BY CASE WHEN c.status = 'Outstanding' THEN 0 ELSE 1 END, "
            + "         c.conditionType, c.createdAt DESC")
    List<LoanCondition> findByApplicationIdOrdered(@Param("appId") Long applicationId);
}
