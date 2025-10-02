package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    
    Optional<Property> findByApplication(LoanApplication application);
    
    @Query("SELECT p FROM Property p WHERE p.application.id = :applicationId")
    Optional<Property> findByApplicationId(@Param("applicationId") Long applicationId);
    
    @Query("SELECT p FROM Property p WHERE p.state = :state ORDER BY p.city")
    List<Property> findByStateOrderByCity(@Param("state") String state);
    
    @Query("SELECT p FROM Property p WHERE p.propertyType = :propertyType")
    List<Property> findByPropertyType(@Param("propertyType") String propertyType);
    
    @Query("SELECT p FROM Property p WHERE p.city = :city AND p.state = :state")
    List<Property> findByCityAndState(@Param("city") String city, @Param("state") String state);
}
