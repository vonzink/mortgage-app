package com.msfg.mortgage.dto;

import java.util.List;

/**
 * Page envelope returned by {@code GET /api/loan-applications}. Matches what
 * the frontend's {@code useFilterUrlState} expects:
 * {@code { content, totalElements, totalPages, page, size }}.
 */
public record LoanListPage(
    List<LoanListRow> content,
    long totalElements,
    int totalPages,
    int page,
    int size
) {}
