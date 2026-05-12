package com.msfg.mortgage.repository;

import com.msfg.mortgage.model.HousingExpense;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HousingExpenseRepository extends JpaRepository<HousingExpense, Long> {

    @Query("SELECT h FROM HousingExpense h WHERE h.applicationId = :appId ORDER BY h.sequenceNumber, h.expenseType")
    List<HousingExpense> findByApplicationIdOrdered(@Param("appId") Long applicationId);

    /** Wholesale-replace helper — clears all expenses for a loan before re-importing. */
    @Modifying
    @Transactional
    @Query("DELETE FROM HousingExpense h WHERE h.applicationId = :appId")
    int deleteByApplicationId(@Param("appId") Long applicationId);
}
