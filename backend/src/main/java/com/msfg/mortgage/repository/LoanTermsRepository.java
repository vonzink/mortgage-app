package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.LoanTerms;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoanTermsRepository extends JpaRepository<LoanTerms, Long> {
    Optional<LoanTerms> findByApplicationId(Long applicationId);
}
