package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BorrowerRepository extends JpaRepository<Borrower, Long> {
    
    List<Borrower> findByApplication(LoanApplication application);
    
    List<Borrower> findByApplicationOrderBySequenceNumber(LoanApplication application);
    
    @Query("SELECT b FROM Borrower b WHERE b.application.id = :applicationId ORDER BY b.sequenceNumber")
    List<Borrower> findByApplicationIdOrderBySequenceNumber(@Param("applicationId") Long applicationId);
    
    Optional<Borrower> findByApplicationAndSequenceNumber(LoanApplication application, Integer sequenceNumber);
    
    @Query("SELECT b FROM Borrower b WHERE b.application.id = :applicationId AND b.sequenceNumber = :sequenceNumber")
    Optional<Borrower> findByApplicationIdAndSequenceNumber(@Param("applicationId") Long applicationId, @Param("sequenceNumber") Integer sequenceNumber);
    
    @Query("SELECT b FROM Borrower b WHERE b.email = :email")
    List<Borrower> findByEmail(@Param("email") String email);
}
