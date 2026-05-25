package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.FolderEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

public interface FolderEvaluationRepository extends JpaRepository<FolderEvaluation, Long> {

    @Query("SELECT fe FROM FolderEvaluation fe " +
           "WHERE fe.applicationId = :appId AND fe.folderTemplateId = :folderId " +
           "ORDER BY fe.createdAt DESC")
    java.util.List<FolderEvaluation> findLatestForFolder(
            @Param("appId") Long appId, @Param("folderId") Long folderId);

    default Optional<FolderEvaluation> latestFor(Long appId, Long folderId) {
        return findLatestForFolder(appId, folderId).stream().findFirst();
    }

    @Query("SELECT COALESCE(SUM(fe.costUsd), 0) FROM FolderEvaluation fe " +
           "WHERE fe.createdAt >= :since")
    BigDecimal sumCostSince(@Param("since") LocalDateTime since);
}
