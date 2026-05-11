package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentTypeRepository extends JpaRepository<DocumentType, Long> {

    Optional<DocumentType> findBySlug(String slug);

    @Query("SELECT dt FROM DocumentType dt WHERE dt.isActive = true ORDER BY dt.sortOrder")
    List<DocumentType> findByIsActiveTrue();
}
