package com.msfg.mortgage.dto;

import com.msfg.mortgage.model.FolderEvaluation;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Wire shape for the workspace card. Flat — no nested entities. */
public record FolderEvaluationDTO(
        Long id,
        Long applicationId,
        Long folderTemplateId,
        String provider,
        String model,
        Boolean providerCalled,
        String responseMarkdown,
        String status,
        String reason,
        Integer estimatedInputTokens,
        Integer actualInputTokens,
        Integer actualOutputTokens,
        BigDecimal costUsd,
        Integer pageCount,
        String parser,
        Boolean scannedLikely,
        String errorMessage,
        Integer createdByUserId,
        LocalDateTime createdAt
) {
    public static FolderEvaluationDTO from(FolderEvaluation e) {
        return new FolderEvaluationDTO(
                e.getId(), e.getApplicationId(), e.getFolderTemplateId(),
                e.getProvider(), e.getModel(), e.getProviderCalled(),
                e.getResponseMarkdown(), e.getStatus(), e.getReason(),
                e.getEstimatedInputTokens(), e.getActualInputTokens(), e.getActualOutputTokens(),
                e.getCostUsd(), e.getPageCount(), e.getParser(), e.getScannedLikely(),
                e.getErrorMessage(), e.getCreatedByUserId(), e.getCreatedAt()
        );
    }
}
