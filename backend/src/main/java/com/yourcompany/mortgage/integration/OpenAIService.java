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
    private final RestTemplate restTemplate;

    public OpenAIService() {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(20000);
        this.restTemplate = new RestTemplate(factory);
    }

    public AIReviewResult evaluateApplication(LoanApplication application) {
        try {
            if (apiKey == null || apiKey.isBlank()) {
                AIReviewResult noKey = new AIReviewResult();
                noKey.setSummary("AI not configured (set OPENAI_API_KEY in your environment)");
                noKey.setIssues(java.util.Collections.emptyList());
                noKey.setMissingFields(java.util.Collections.emptyList());
                noKey.setRecommendedDocuments(java.util.Collections.emptyList());
                return noKey;
            }
            String promptTemplate = loadPromptTemplate();
            // Serialize, then redact PII such as SSN
            JsonNode node = objectMapper.valueToTree(application);
            JsonNode redacted = redactPII(node);
            String applicationJson = objectMapper.writeValueAsString(redacted);
            String userPrompt = promptTemplate.replace("{{applicationJson}}", applicationJson);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", modelId);

            // Build messages array programmatically to avoid JSON escaping issues
            var messages = objectMapper.createArrayNode();
            ObjectNode systemMsg = objectMapper.createObjectNode();
            systemMsg.put("role", "system");
            systemMsg.put("content", "You are an expert mortgage underwriting assistant. Always reply with strict JSON only.");
            ObjectNode userMsg = objectMapper.createObjectNode();
            userMsg.put("role", "user");
            userMsg.put("content", userPrompt);
            messages.add(systemMsg);
            messages.add(userMsg);
            requestBody.set("messages", messages);

            // Encourage strict JSON output where supported
            ObjectNode responseFormat = objectMapper.createObjectNode();
            responseFormat.put("type", "json_object");
            requestBody.set("response_format", responseFormat);

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

    public AIReviewResult evaluateApplicationDTO(Object applicationDTO) {
        try {
            if (apiKey == null || apiKey.isBlank()) {
                AIReviewResult noKey = new AIReviewResult();
                noKey.setSummary("AI not configured (set OPENAI_API_KEY in your environment)");
                noKey.setIssues(java.util.Collections.emptyList());
                noKey.setMissingFields(java.util.Collections.emptyList());
                noKey.setRecommendedDocuments(java.util.Collections.emptyList());
                return noKey;
            }
            String promptTemplate = loadPromptTemplate();
            JsonNode node = objectMapper.valueToTree(applicationDTO);
            JsonNode redacted = redactPII(node);
            String applicationJson = objectMapper.writeValueAsString(redacted);
            String userPrompt = promptTemplate.replace("{{applicationJson}}", applicationJson);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", modelId);

            // Build messages array programmatically to avoid JSON escaping issues
            var messages = objectMapper.createArrayNode();
            ObjectNode systemMsg = objectMapper.createObjectNode();
            systemMsg.put("role", "system");
            systemMsg.put("content", "You are an expert mortgage underwriting assistant. Always reply with strict JSON only.");
            ObjectNode userMsg = objectMapper.createObjectNode();
            userMsg.put("role", "user");
            userMsg.put("content", userPrompt);
            messages.add(systemMsg);
            messages.add(userMsg);
            requestBody.set("messages", messages);

            // Encourage strict JSON output where supported
            ObjectNode responseFormat = objectMapper.createObjectNode();
            responseFormat.put("type", "json_object");
            requestBody.set("response_format", responseFormat);

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

    private JsonNode redactPII(JsonNode node) {
        if (node == null) return node;
        if (node.isObject()) {
            ObjectNode obj = (ObjectNode) node;
            obj.fieldNames().forEachRemaining(field -> {
                if (field.equalsIgnoreCase("ssn") || field.equalsIgnoreCase("socialSecurityNumber")) {
                    obj.put(field, "REDACTED");
                } else {
                    JsonNode child = obj.get(field);
                    JsonNode redactedChild = redactPII(child);
                    obj.set(field, redactedChild);
                }
            });
            return obj;
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                ((com.fasterxml.jackson.databind.node.ArrayNode) node).set(i, redactPII(node.get(i)));
            }
            return node;
        } else {
            return node;
        }
    }
}


