package com.msfg.mortgage.dto;

/**
 * Lean row for the TopBar typeahead dropdown. Only what the dropdown renders:
 * primary name + secondary identity (city + app#) + status pill.
 */
public record LoanSearchHit(
    Long id,
    String applicationNumber,
    String borrowerName,
    String city,
    String state,
    String status
) {}
