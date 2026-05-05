package com.yourcompany.mortgage.repository;

import com.yourcompany.mortgage.model.PurchaseCredit;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseCreditRepository extends JpaRepository<PurchaseCredit, Long> {

    @Query("SELECT pc FROM PurchaseCredit pc WHERE pc.applicationId = :appId "
            + "ORDER BY pc.sequenceNumber, pc.creditType")
    List<PurchaseCredit> findByApplicationIdOrdered(@Param("appId") Long applicationId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PurchaseCredit pc WHERE pc.applicationId = :appId")
    int deleteByApplicationId(@Param("appId") Long applicationId);
}
