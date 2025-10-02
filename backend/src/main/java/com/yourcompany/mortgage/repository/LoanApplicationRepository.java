package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {
    
    Optional<LoanApplication> findByApplicationNumber(String applicationNumber);
    
    List<LoanApplication> findByStatus(String status);
    
    List<LoanApplication> findByStatusOrderByCreatedDateDesc(String status);
    
    @Query("SELECT la FROM LoanApplication la WHERE la.status IN :statuses ORDER BY la.createdDate DESC")
    List<LoanApplication> findByStatusInOrderByCreatedDateDesc(@Param("statuses") List<String> statuses);
    
    @Query("SELECT la FROM LoanApplication la WHERE la.ghlContactId = :ghlContactId")
    Optional<LoanApplication> findByGhlContactId(@Param("ghlContactId") String ghlContactId);
    
    @Query("SELECT COUNT(la) FROM LoanApplication la WHERE la.status = :status")
    Long countByStatus(@Param("status") String status);
}
