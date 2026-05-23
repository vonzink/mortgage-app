package com.msfg.mortgage.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Parsed query-param bag for {@code GET /api/loan-applications}. Built once
 * per request from the {@code @RequestParam} values. Optionals are empty when
 * the caller omitted that filter; lists are empty (not null) when the caller
 * omitted them.
 *
 * <p>{@code sortField} is whitelisted in the service — only
 * {@code createdDate}, {@code statusChangedAt}, and {@code loanAmount} are
 * valid; anything else falls back to {@code createdDate DESC}.
 */
public record LoanListFilters(
    List<String> statuses,
    Optional<Integer> assignedLoId,
    Optional<Integer> conditionsGt,
    Optional<LocalDate> closingFrom,
    Optional<LocalDate> closingTo,
    Optional<Integer> stageAgeGtDays,
    List<String> loanTypes,
    Optional<BigDecimal> amountMin,
    Optional<BigDecimal> amountMax,
    String sortField,
    String sortDirection,
    int page,
    int size
) {
    public static LoanListFilters defaults() {
        return new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "createdDate", "desc", 0, 25
        );
    }
}
