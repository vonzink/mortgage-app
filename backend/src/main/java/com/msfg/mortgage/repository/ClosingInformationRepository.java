package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.ClosingInformation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClosingInformationRepository extends JpaRepository<ClosingInformation, Long> {
    Optional<ClosingInformation> findByLoanApplicationId(Long loanApplicationId);
}
