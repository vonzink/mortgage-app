package com.msfg.mortgage.dto;

public record AppSettingsPublicDTO(Boolean aiEvalEnabled) {
    public static AppSettingsPublicDTO from(com.msfg.mortgage.model.AppSettings s) {
        return new AppSettingsPublicDTO(Boolean.TRUE.equals(s.getAiEvalEnabled()));
    }
}
