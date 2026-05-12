package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.Document;
import com.msfg.mortgage.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByApplication(LoanApplication application);

    @Query("SELECT d FROM Document d WHERE d.application.id = :applicationId")
    List<Document> findByApplicationId(@Param("applicationId") Long applicationId);

    @Query("SELECT d FROM Document d WHERE d.application.id = :applicationId AND d.uploadStatus = 'uploaded' AND d.deletedAt IS NULL ORDER BY d.uploadedAt DESC")
    List<Document> findUploadedByApplicationId(@Param("applicationId") Long applicationId);

    @Query("SELECT d FROM Document d WHERE d.documentType = :documentType AND d.deletedAt IS NULL")
    List<Document> findByDocumentType(@Param("documentType") String documentType);

    @Query("SELECT d FROM Document d WHERE d.application.id = :applicationId AND d.documentType = :documentType AND d.deletedAt IS NULL")
    List<Document> findByApplicationIdAndDocumentType(@Param("applicationId") Long applicationId, @Param("documentType") String documentType);

    @Query("SELECT d FROM Document d WHERE d.docUuid = :docUuid AND d.deletedAt IS NULL")
    Optional<Document> findByDocUuid(@Param("docUuid") String docUuid);
}