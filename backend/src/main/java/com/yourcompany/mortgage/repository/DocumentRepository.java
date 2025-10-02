package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.Document;
import com.yourcompany.mortgage.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    List<Document> findByApplication(LoanApplication application);
    
    @Query("SELECT d FROM Document d WHERE d.application.id = :applicationId")
    List<Document> findByApplicationId(@Param("applicationId") Long applicationId);
    
    @Query("SELECT d FROM Document d WHERE d.documentType = :documentType")
    List<Document> findByDocumentType(@Param("documentType") String documentType);
    
    @Query("SELECT d FROM Document d WHERE d.application.id = :applicationId AND d.documentType = :documentType")
    List<Document> findByApplicationIdAndDocumentType(@Param("applicationId") Long applicationId, @Param("documentType") String documentType);
}