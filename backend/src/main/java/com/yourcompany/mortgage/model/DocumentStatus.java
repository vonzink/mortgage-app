package com.yourcompany.mortgage.model;

import java.util.Map;
import java.util.Set;

public enum DocumentStatus {

    PENDING_UPLOAD,
    UPLOADED,
    SCAN_PENDING,
    SCAN_FAILED,
    READY_FOR_REVIEW,
    NEEDS_BORROWER_ACTION,
    ACCEPTED,
    REJECTED,
    ARCHIVED,
    DELETED_SOFT;

    private static final Map<DocumentStatus, Set<DocumentStatus>> VALID_TRANSITIONS = Map.of(
            PENDING_UPLOAD,         Set.of(UPLOADED, SCAN_FAILED),
            UPLOADED,               Set.of(SCAN_PENDING, READY_FOR_REVIEW, DELETED_SOFT),
            SCAN_PENDING,           Set.of(SCAN_FAILED, READY_FOR_REVIEW),
            SCAN_FAILED,            Set.of(READY_FOR_REVIEW, DELETED_SOFT),
            READY_FOR_REVIEW,       Set.of(ACCEPTED, REJECTED, NEEDS_BORROWER_ACTION, ARCHIVED, DELETED_SOFT),
            NEEDS_BORROWER_ACTION,  Set.of(UPLOADED, DELETED_SOFT),
            ACCEPTED,               Set.of(ARCHIVED, READY_FOR_REVIEW),
            REJECTED,               Set.of(READY_FOR_REVIEW, DELETED_SOFT),
            ARCHIVED,               Set.of(READY_FOR_REVIEW),
            DELETED_SOFT,           Set.of()
    );

    public boolean canTransitionTo(DocumentStatus target) {
        Set<DocumentStatus> allowed = VALID_TRANSITIONS.get(this);
        return allowed != null && allowed.contains(target);
    }

    public Set<DocumentStatus> validTransitions() {
        return VALID_TRANSITIONS.getOrDefault(this, Set.of());
    }

    public static DocumentStatus fromString(String value) {
        if (value == null) return PENDING_UPLOAD;
        return switch (value.toLowerCase()) {
            case "pending", "pending_upload" -> PENDING_UPLOAD;
            case "uploaded"                  -> UPLOADED;
            case "scan_pending"              -> SCAN_PENDING;
            case "scan_failed", "failed"     -> SCAN_FAILED;
            case "ready_for_review"          -> READY_FOR_REVIEW;
            case "needs_borrower_action"     -> NEEDS_BORROWER_ACTION;
            case "accepted"                  -> ACCEPTED;
            case "rejected"                  -> REJECTED;
            case "archived"                  -> ARCHIVED;
            case "deleted", "deleted_soft"   -> DELETED_SOFT;
            default -> valueOf(value.toUpperCase());
        };
    }
}
