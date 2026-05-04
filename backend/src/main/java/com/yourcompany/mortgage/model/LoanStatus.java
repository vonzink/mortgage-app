package com.yourcompany.mortgage.model;

import java.util.Arrays;
import java.util.Optional;

/**
 * The 11-stage loan workflow + a terminal {@link #DISPOSITIONED} state.
 *
 * <p>Order matches the natural progression a loan officer walks through. The "happy path" is
 * {@link #REGISTERED} → {@link #FUNDED}. {@link #DISPOSITIONED} is a terminal off-ramp for
 * denied / withdrawn / cancelled / expired loans.
 *
 * <p>Stored in {@code loan_applications.status} as VARCHAR(30) to keep the existing String-based
 * service layer simple. Use {@link #fromString(String)} for parsing — it's case-insensitive and
 * tolerates the legacy DRAFT/SUBMITTED/PROCESSING values by mapping them onto the new enum.
 */
public enum LoanStatus {
    REGISTERED,
    APPLICATION,
    DISCLOSURES_SENT,
    DISCLOSURES_SIGNED,
    UNDERWRITING,
    APPROVED,
    APPRAISAL,
    INSURANCE,
    CTC,
    DOCS_OUT,
    FUNDED,

    /** Terminal off-ramp: denied / withdrawn / cancelled / expired. */
    DISPOSITIONED;

    /**
     * Parse a status string into the enum, with case-insensitive matching and legacy-value
     * fallbacks. Returns empty if the value isn't recognized.
     */
    public static Optional<LoanStatus> fromString(String value) {
        if (value == null) return Optional.empty();
        String normalized = value.trim().toUpperCase().replace(' ', '_').replace('-', '_');
        return switch (normalized) {
            case "DRAFT" -> Optional.of(REGISTERED);
            case "SUBMITTED" -> Optional.of(APPLICATION);
            case "PROCESSING" -> Optional.of(UNDERWRITING);
            case "DENIED" -> Optional.of(DISPOSITIONED);
            default -> Arrays.stream(values())
                    .filter(s -> s.name().equals(normalized))
                    .findFirst();
        };
    }

    /** True if this is a terminal status (no further transitions). */
    public boolean isTerminal() {
        return this == FUNDED || this == DISPOSITIONED;
    }
}
