package com.msfg.mortgage.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Flat projection of one loan as it appears in a pipeline-table row.
 *
 * <p>Shaped for the Hybrid column set: Borrower+Property, Status+stage-age,
 * outstanding conditions, Amount+LTV, Close, LO. LTV is precomputed here
 * ({@code loanAmount / propertyValue * 100}) so the frontend doesn't have
 * to recompute per row.
 */
public record LoanListRow(
    Long id,
    String applicationNumber,
    String status,
    String borrowerName,
    String city,
    String state,
    Integer outstandingConditions,
    BigDecimal loanAmount,
    BigDecimal propertyValue,
    Double ltvPct,
    LocalDate estClosingDate,
    String assignedLoName,
    LocalDateTime statusChangedAt,
    LocalDateTime createdDate
) {}
