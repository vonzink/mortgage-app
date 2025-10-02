package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.REOProperty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface REOPropertyRepository extends JpaRepository<REOProperty, Long> {
    
    /**
     * Find all REO properties for a specific borrower
     */
    List<REOProperty> findByBorrowerIdOrderBySequenceNumber(Long borrowerId);
    
    /**
     * Find all REO properties for a specific borrower with sequence number
     */
    @Query("SELECT r FROM REOProperty r WHERE r.borrower.id = :borrowerId AND r.sequenceNumber = :sequenceNumber")
    REOProperty findByBorrowerIdAndSequenceNumber(@Param("borrowerId") Long borrowerId, @Param("sequenceNumber") Integer sequenceNumber);
    
    /**
     * Count REO properties for a specific borrower
     */
    long countByBorrowerId(Long borrowerId);
    
    /**
     * Find REO properties by borrower and property type
     */
    List<REOProperty> findByBorrowerIdAndPropertyTypeOrderBySequenceNumber(Long borrowerId, String propertyType);
    
    /**
     * Get the next sequence number for a borrower's REO properties
     */
    @Query("SELECT COALESCE(MAX(r.sequenceNumber), 0) + 1 FROM REOProperty r WHERE r.borrower.id = :borrowerId")
    Integer getNextSequenceNumber(@Param("borrowerId") Long borrowerId);
}
