package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    
    List<Asset> findByBorrowerId(Long borrowerId);
    
    void deleteByBorrowerId(Long borrowerId);
}

