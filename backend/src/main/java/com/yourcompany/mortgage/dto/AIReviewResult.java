package com.yourcompany.mortgage.dto;

import java.util.List;

public class AIReviewResult {

    private String summary;
    private List<String> issues;
    private List<String> missingFields;
    private List<String> recommendedDocuments;

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getIssues() {
        return issues;
    }

    public void setIssues(List<String> issues) {
        this.issues = issues;
    }

    public List<String> getMissingFields() {
        return missingFields;
    }

    public void setMissingFields(List<String> missingFields) {
        this.missingFields = missingFields;
    }

    public List<String> getRecommendedDocuments() {
        return recommendedDocuments;
    }

    public void setRecommendedDocuments(List<String> recommendedDocuments) {
        this.recommendedDocuments = recommendedDocuments;
    }
}


