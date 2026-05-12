package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.FolderTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderTemplateRepository extends JpaRepository<FolderTemplate, Long> {

    @Query("SELECT t FROM FolderTemplate t WHERE t.isActive = true ORDER BY t.sortOrder, t.displayName")
    List<FolderTemplate> findActiveOrdered();

    @Query("SELECT t FROM FolderTemplate t ORDER BY t.sortOrder, t.displayName")
    List<FolderTemplate> findAllOrdered();

    Optional<FolderTemplate> findByDisplayName(String displayName);
}
