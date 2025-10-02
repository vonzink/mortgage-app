package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.IncomeSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncomeSourceRepository extends JpaRepository<IncomeSource, Long> {
    List<IncomeSource> findByBorrowerId(Long borrowerId);
}
