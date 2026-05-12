package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.ClosingFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClosingFeeRepository extends JpaRepository<ClosingFee, Long> {
    List<ClosingFee> findByApplicationIdOrderBySequenceNumberAsc(Long applicationId);
    void deleteByApplicationId(Long applicationId);
}
