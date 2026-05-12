package com.msfg.mortgage.model;

import org.junit.jupiter.api.Test;

import static com.msfg.mortgage.model.DocumentStatus.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit coverage for the {@link DocumentStatus} state machine — locks down the legal
 * transitions and the legacy-string mapping. The state machine is consulted on every
 * status change, accept/reject, request-revision, and bulk-review call, so silent
 * regressions here would corrupt the audit story.
 */
class DocumentStatusTest {

    // ── Happy-path transitions ────────────────────────────────────────────────

    @Test
    void pendingUpload_canMoveToUploaded() {
        assertThat(PENDING_UPLOAD.canTransitionTo(UPLOADED)).isTrue();
    }

    @Test
    void uploaded_canMoveToReadyForReview() {
        assertThat(UPLOADED.canTransitionTo(READY_FOR_REVIEW)).isTrue();
    }

    @Test
    void readyForReview_canMoveToAccepted() {
        assertThat(READY_FOR_REVIEW.canTransitionTo(ACCEPTED)).isTrue();
    }

    @Test
    void readyForReview_canMoveToRejected() {
        assertThat(READY_FOR_REVIEW.canTransitionTo(REJECTED)).isTrue();
    }

    @Test
    void readyForReview_canMoveToNeedsBorrowerAction() {
        assertThat(READY_FOR_REVIEW.canTransitionTo(NEEDS_BORROWER_ACTION)).isTrue();
    }

    @Test
    void accepted_canReopenForReview() {
        // Reopening an accepted document — the underwriter occasionally needs to
        // unblock a stale acceptance.
        assertThat(ACCEPTED.canTransitionTo(READY_FOR_REVIEW)).isTrue();
    }

    @Test
    void rejected_canReopenForReview() {
        assertThat(REJECTED.canTransitionTo(READY_FOR_REVIEW)).isTrue();
    }

    // ── Illegal transitions ──────────────────────────────────────────────────

    @Test
    void pendingUpload_cannotJumpDirectlyToAccepted() {
        // A doc must move through UPLOADED → READY_FOR_REVIEW before acceptance.
        assertThat(PENDING_UPLOAD.canTransitionTo(ACCEPTED)).isFalse();
    }

    @Test
    void accepted_cannotMoveDirectlyToRejected() {
        // Have to re-open for review first, audit trail must show the deliberate
        // decision to reverse.
        assertThat(ACCEPTED.canTransitionTo(REJECTED)).isFalse();
    }

    @Test
    void deletedSoft_isTerminal() {
        // Soft-deleted documents do not transition anywhere — restoring requires
        // explicit out-of-band action.
        assertThat(DELETED_SOFT.validTransitions()).isEmpty();
    }

    // ── Legacy string mapping (V18 migrated rows used the old short keys) ────

    @Test
    void fromString_acceptsLegacyPending() {
        assertThat(DocumentStatus.fromString("pending")).isEqualTo(PENDING_UPLOAD);
    }

    @Test
    void fromString_acceptsLegacyFailed() {
        assertThat(DocumentStatus.fromString("failed")).isEqualTo(SCAN_FAILED);
    }

    @Test
    void fromString_acceptsLegacyDeleted() {
        assertThat(DocumentStatus.fromString("deleted")).isEqualTo(DELETED_SOFT);
    }

    @Test
    void fromString_caseInsensitive() {
        assertThat(DocumentStatus.fromString("AcCePtEd")).isEqualTo(ACCEPTED);
    }

    @Test
    void fromString_nullDefaultsToPendingUpload() {
        assertThat(DocumentStatus.fromString(null)).isEqualTo(PENDING_UPLOAD);
    }

    @Test
    void fromString_unknownThrows() {
        assertThatThrownBy(() -> DocumentStatus.fromString("not_a_real_status"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validTransitions_listsAllAllowedTargets() {
        // Sanity: READY_FOR_REVIEW is the busiest fan-out node; assert the full
        // set so a future edit to the map can't silently drop one.
        assertThat(READY_FOR_REVIEW.validTransitions())
                .containsExactlyInAnyOrder(ACCEPTED, REJECTED, NEEDS_BORROWER_ACTION, ARCHIVED, DELETED_SOFT);
    }
}
