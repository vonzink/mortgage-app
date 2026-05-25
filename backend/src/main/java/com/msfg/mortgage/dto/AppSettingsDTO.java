package com.msfg.mortgage.dto;

public record AppSettingsDTO(
        Integer id,
        Boolean aiEvalEnabled,
        String llmDefaultProvider,
        String llmDefaultModel
) {
    public static AppSettingsDTO from(com.msfg.mortgage.model.AppSettings s) {
        return new AppSettingsDTO(
                s.getId(),
                Boolean.TRUE.equals(s.getAiEvalEnabled()),
                s.getLlmDefaultProvider(),
                s.getLlmDefaultModel());
    }
}
