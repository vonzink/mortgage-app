package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.Employment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmploymentRepository extends JpaRepository<Employment, Long> {
    
    List<Employment> findByBorrower(Borrower borrower);
    
    List<Employment> findByBorrowerOrderBySequenceNumber(Borrower borrower);
    
    @Query("SELECT e FROM Employment e WHERE e.borrower.id = :borrowerId ORDER BY e.sequenceNumber")
    List<Employment> findByBorrowerIdOrderBySequenceNumber(@Param("borrowerId") Long borrowerId);
    
    Optional<Employment> findByBorrowerAndSequenceNumber(Borrower borrower, Integer sequenceNumber);
    
    @Query("SELECT e FROM Employment e WHERE e.borrower.id = :borrowerId AND e.sequenceNumber = :sequenceNumber")
    Optional<Employment> findByBorrowerIdAndSequenceNumber(@Param("borrowerId") Long borrowerId, @Param("sequenceNumber") Integer sequenceNumber);
    
    @Query("SELECT e FROM Employment e WHERE e.employmentStatus = :status")
    List<Employment> findByEmploymentStatus(@Param("status") String status);
    
    @Query("SELECT e FROM Employment e WHERE e.selfEmployed = true")
    List<Employment> findBySelfEmployedTrue();
    
    @Query("SELECT e FROM Employment e WHERE e.borrower.id = :borrowerId AND e.employmentStatus = 'Present'")
    List<Employment> findCurrentEmploymentByBorrowerId(@Param("borrowerId") Long borrowerId);
}
