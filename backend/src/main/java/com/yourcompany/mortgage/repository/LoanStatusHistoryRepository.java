package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.LoanStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanStatusHistoryRepository extends JpaRepository<LoanStatusHistory, Long> {

    /** All transitions for a loan, oldest first — used to build the borrower's status timeline. */
    List<LoanStatusHistory> findByLoanApplicationIdOrderByTransitionedAtAsc(Long loanApplicationId);
}
