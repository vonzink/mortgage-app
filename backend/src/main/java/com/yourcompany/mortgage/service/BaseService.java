package com.yourcompany.mortgage.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * Base service interface with common CRUD operations
 */
public interface BaseService<T, ID> {
    
    /**
     * Create a new entity
     */
    T create(T entity);
    
    /**
     * Update an existing entity
     */
    T update(ID id, T entity);
    
    /**
     * Find entity by ID
     */
    Optional<T> findById(ID id);
    
    /**
     * Find all entities
     */
    List<T> findAll();
    
    /**
     * Find all entities with pagination
     */
    Page<T> findAll(Pageable pageable);
    
    /**
     * Delete entity by ID
     */
    void deleteById(ID id);
    
    /**
     * Check if entity exists by ID
     */
    boolean existsById(ID id);
    
    /**
     * Count all entities
     */
    long count();
}
