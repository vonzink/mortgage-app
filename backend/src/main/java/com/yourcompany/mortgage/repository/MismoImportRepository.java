package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.MismoImport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MismoImportRepository extends JpaRepository<MismoImport, Long> {

    /** Most-recent-first listing for the audit panel + revert UI. */
    List<MismoImport> findByLoanApplicationIdOrderByImportedAtDesc(Long loanApplicationId);
}
