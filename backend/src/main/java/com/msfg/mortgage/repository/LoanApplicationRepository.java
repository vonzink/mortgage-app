package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.LoanApplication;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {
    
    Optional<LoanApplication> findByApplicationNumber(String applicationNumber);

    Optional<LoanApplication> findBySourceLeadId(String sourceLeadId);
    
    List<LoanApplication> findByStatus(String status);
    
    List<LoanApplication> findByStatusOrderByCreatedDateDesc(String status);
    
    @Query("SELECT la FROM LoanApplication la WHERE la.status IN :statuses ORDER BY la.createdDate DESC")
    List<LoanApplication> findByStatusInOrderByCreatedDateDesc(@Param("statuses") List<String> statuses);
    
    @Query("SELECT la FROM LoanApplication la WHERE la.ghlContactId = :ghlContactId")
    Optional<LoanApplication> findByGhlContactId(@Param("ghlContactId") String ghlContactId);
    
    @Query("SELECT COUNT(la) FROM LoanApplication la WHERE la.status = :status")
    Long countByStatus(@Param("status") String status);

    /** Loans where the given user is one of the borrowers. */
    @Query("""
            SELECT DISTINCT la FROM LoanApplication la
            JOIN la.borrowers b
            WHERE b.userId = :userId
            ORDER BY la.createdDate DESC
            """)
    List<LoanApplication> findByBorrowerUserId(@Param("userId") Integer userId);

    /** Loans where the given user is the assigned LO. */
    List<LoanApplication> findByAssignedLoIdOrderByCreatedDateDesc(Integer assignedLoId);

    /** Loans where the given user is one of the attached real-estate agents. */
    @Query(value = """
            SELECT DISTINCT la.* FROM loan_applications la
            JOIN loan_agents agt ON agt.loan_application_id = la.id
            WHERE agt.user_id = :userId
            ORDER BY la.created_date DESC
            """, nativeQuery = true)
    List<LoanApplication> findByAgentUserId(@Param("userId") Integer userId);

    /**
     * Funnel intakes whose suite hand-off never landed ({@code suite_loan_id IS NULL}) —
     * {@code SuiteReconciliationJob} re-drives these. Eager-fetches property + borrowers so the
     * payload can be rebuilt outside a transaction.
     */
    @EntityGraph(attributePaths = {"property", "borrowers"})
    List<LoanApplication> findBySuiteLoanIdIsNull();
}
