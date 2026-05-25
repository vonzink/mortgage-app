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

    /**
     * Uploaded documents in the loan's folder whose name matches the given folder template.
     *
     * <p>Note: {@code folders} has no FK to {@code folder_templates} (V11 vs V21 history).
     * The linkage convention from {@link com.msfg.mortgage.service.FolderService#ensureSeeded}
     * is name-based: the seeded folder's {@code name_normalized} equals
     * {@code lower(trim(template.display_name))}. We mirror that here.
     */
    @Query("""
        SELECT d FROM Document d
         WHERE d.application.id = :appId
           AND d.uploadStatus = 'uploaded'
           AND d.deletedAt IS NULL
           AND d.folderId IN (
               SELECT f.id FROM Folder f
                WHERE f.applicationId = :appId
                  AND f.deletedAt IS NULL
                  AND f.nameNormalized = (
                      SELECT LOWER(TRIM(ft.displayName))
                        FROM FolderTemplate ft
                       WHERE ft.id = :folderTemplateId))
        ORDER BY d.uploadedAt
        """)
    List<Document> findUploadedInFolderTemplate(
            @Param("appId") Long appId,
            @Param("folderTemplateId") Long folderTemplateId);
}