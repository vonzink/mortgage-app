package com.yourcompany.mortgage.integration;

import com.yourcompany.mortgage.dto.AIReviewResult;
import com.yourcompany.mortgage.model.LoanApplication;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Stub for the AI review feature.
 *
 * The previous implementation called OpenAI's chat completions endpoint with a
 * prompt template and parsed structured JSON back. That code was removed when
 * the feature was paused; this stub keeps the controller / DTO / frontend
 * wiring intact so the future re-implementation can drop in without touching
 * the API surface.
 *
 * When ready to re-enable: replace the bodies below with calls to whichever
 * provider is chosen (Anthropic, OpenAI, Bedrock, etc.). The DTO contract is
 * documented by {@link AIReviewResult}.
 */
@Service
public class AiReviewService {

    private static final String PLACEHOLDER_SUMMARY =
            "AI review is not yet enabled. This feature will analyze the application "
                    + "for missing fields, identify needed documents, and answer borrower questions.";

    public AIReviewResult evaluateApplication(LoanApplication application) {
        return placeholder();
    }

    public AIReviewResult evaluateApplicationDTO(Object applicationDTO) {
        return placeholder();
    }

    private AIReviewResult placeholder() {
        AIReviewResult result = new AIReviewResult();
        result.setSummary(PLACEHOLDER_SUMMARY);
        result.setIssues(List.of());
        result.setMissingFields(List.of());
        result.setRecommendedDocuments(List.of());
        return result;
    }
}
