package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.Document;
import com.yourcompany.mortgage.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByApplication(LoanApplication application);

    @Query("SELECT d FROM Document d WHERE d.application.id = :applicationId AND d.deletedAt IS NULL "
            + "ORDER BY d.documentType, d.createdAt")
    List<Document> findByApplicationIdAndDeletedAtIsNull(@Param("applicationId") Long applicationId);

    Optional<Document> findByDocUuid(String docUuid);

    @Query("SELECT d FROM Document d WHERE d.documentType = :documentType AND d.deletedAt IS NULL")
    List<Document> findByDocumentType(@Param("documentType") String documentType);
}
