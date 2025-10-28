package com.yourcompany.mortgage.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.yourcompany.mortgage.dto.AIReviewResult;
import com.yourcompany.mortgage.model.LoanApplication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

@Service
public class OpenAIService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.model.id}")
    private String modelId;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public AIReviewResult evaluateApplication(LoanApplication application) {
        try {
            if (apiKey == null || apiKey.isBlank()) {
                AIReviewResult noKey = new AIReviewResult();
                noKey.setSummary("AI not configured (OPENAI_API_KEY missing)");
                noKey.setIssues(java.util.Collections.emptyList());
                noKey.setMissingFields(java.util.Collections.emptyList());
                noKey.setRecommendedDocuments(java.util.Collections.emptyList());
                return noKey;
            }
            String promptTemplate = loadPromptTemplate();
            String applicationJson = objectMapper.writeValueAsString(application);
            String userPrompt = promptTemplate.replace("{{applicationJson}}", applicationJson);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", modelId);
            requestBody.set("messages", objectMapper.readTree("[" +
                    "{\\\"role\\\":\\\"system\\\",\\\"content\\\":\\\"You are an expert mortgage underwriting assistant. Always reply with strict JSON only.\\\"}," +
                    "{\\\"role\\\":\\\"user\\\",\\\"content\\\":" + objectMapper.writeValueAsString(userPrompt) + "}" +
                    "]"));
            requestBody.put("temperature", 0.2);

            HttpEntity<String> request = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    "https://api.openai.com/v1/chat/completions",
                    HttpMethod.POST,
                    request,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseChatCompletion(response.getBody());
            }

            AIReviewResult fallback = new AIReviewResult();
            fallback.setSummary("AI review unavailable");
            fallback.setIssues(Collections.singletonList("OpenAI API returned status: " + response.getStatusCode()));
            fallback.setMissingFields(Collections.emptyList());
            fallback.setRecommendedDocuments(Collections.emptyList());
            return fallback;

        } catch (Exception ex) {
            AIReviewResult fallback = new AIReviewResult();
            fallback.setSummary("AI review failed");
            fallback.setIssues(Collections.singletonList(ex.getMessage()));
            fallback.setMissingFields(Collections.emptyList());
            fallback.setRecommendedDocuments(Collections.emptyList());
            return fallback;
        }
    }

    private String loadPromptTemplate() throws Exception {
        ClassPathResource resource = new ClassPathResource("prompts/ai_application_review.prompt");
        return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
    }

    private AIReviewResult parseChatCompletion(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                String content = choices.get(0).path("message").path("content").asText("");
                if (content == null) content = "";
                // The model is instructed to return JSON. Attempt to parse directly.
                JsonNode payload = objectMapper.readTree(content);

                AIReviewResult result = new AIReviewResult();
                result.setSummary(payload.path("summary").asText(""));
                result.setIssues(toStringList(payload.path("issues")));
                result.setMissingFields(toStringList(payload.path("missingFields")));
                result.setRecommendedDocuments(toStringList(payload.path("recommendedDocuments")));
                return result;
            }
        } catch (Exception ignore) {
            // Fall through to default
        }

        AIReviewResult fallback = new AIReviewResult();
        fallback.setSummary("AI response could not be parsed");
        fallback.setIssues(Collections.emptyList());
        fallback.setMissingFields(Collections.emptyList());
        fallback.setRecommendedDocuments(Collections.emptyList());
        return fallback;
    }

    private List<String> toStringList(JsonNode node) {
        if (node == null || !node.isArray()) return Collections.emptyList();
        return objectMapper.convertValue(node, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
    }
}


