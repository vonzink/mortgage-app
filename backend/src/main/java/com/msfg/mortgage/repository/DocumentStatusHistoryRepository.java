package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.DocumentStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentStatusHistoryRepository extends JpaRepository<DocumentStatusHistory, Long> {

    @Query("SELECT h FROM DocumentStatusHistory h WHERE h.documentId = :documentId ORDER BY h.transitionedAt DESC")
    List<DocumentStatusHistory> findByDocumentIdOrderByTransitionedAtDesc(@Param("documentId") Long documentId);
}
