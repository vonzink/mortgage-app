package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    /** Live folder by id. */
    @Query("SELECT f FROM Folder f WHERE f.id = :id AND f.deletedAt IS NULL")
    Optional<Folder> findActiveById(@Param("id") Long id);

    /** All live folders for a loan; caller builds the tree from the flat list. */
    @Query("SELECT f FROM Folder f WHERE f.applicationId = :appId AND f.deletedAt IS NULL "
            + "ORDER BY COALESCE(f.sortKey, '~'), f.displayName")
    List<Folder> findLiveByApplicationId(@Param("appId") Long applicationId);

    /** Loan's root folder, if it has one. */
    @Query("SELECT f FROM Folder f WHERE f.applicationId = :appId AND f.parentId IS NULL "
            + "AND f.deletedAt IS NULL")
    Optional<Folder> findRootByApplicationId(@Param("appId") Long applicationId);

    /** Sibling collision check (case-insensitive). */
    @Query("SELECT f FROM Folder f WHERE f.applicationId = :appId AND f.parentId = :parentId "
            + "AND f.nameNormalized = :nameNormalized AND f.deletedAt IS NULL")
    Optional<Folder> findSiblingByName(@Param("appId") Long applicationId,
                                       @Param("parentId") Long parentId,
                                       @Param("nameNormalized") String nameNormalized);
}
