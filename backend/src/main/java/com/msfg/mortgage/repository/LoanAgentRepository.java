package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.LoanAgent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanAgentRepository extends JpaRepository<LoanAgent, Integer> {
    List<LoanAgent> findByApplicationId(Long applicationId);
}
