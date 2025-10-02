package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.Liability;
import com.yourcompany.mortgage.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LiabilityRepository extends JpaRepository<Liability, Long> {
    
    List<Liability> findByApplication(LoanApplication application);
    
    @Query("SELECT l FROM Liability l WHERE l.application.id = :applicationId")
    List<Liability> findByApplicationId(@Param("applicationId") Long applicationId);
    
    @Query("SELECT l FROM Liability l WHERE l.liabilityType = :liabilityType")
    List<Liability> findByLiabilityType(@Param("liabilityType") String liabilityType);
    
    @Query("SELECT l FROM Liability l WHERE l.payoffStatus = true")
    List<Liability> findByPayoffStatusTrue();
    
    @Query("SELECT l FROM Liability l WHERE l.toBePaidOff = true")
    List<Liability> findByToBePaidOffTrue();
    
    @Query("SELECT l FROM Liability l WHERE l.application.id = :applicationId AND l.liabilityType = :liabilityType")
    List<Liability> findByApplicationIdAndLiabilityType(@Param("applicationId") Long applicationId, @Param("liabilityType") String liabilityType);
}
