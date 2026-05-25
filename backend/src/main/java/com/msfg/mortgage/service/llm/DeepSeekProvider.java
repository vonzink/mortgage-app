package com.msfg.mortgage.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msfg.mortgage.config.LlmConfig;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class DeepSeekProvider implements LlmProvider {

    private static final String URL = "https://api.deepseek.com/v1/chat/completions";
    private static final String DEFAULT_MODEL = "deepseek-chat";

    private final LlmConfig config;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json = new ObjectMapper();

    public DeepSeekProvider(LlmConfig config) { this.config = config; }

    @Override public String name() { return "deepseek"; }
    @Override public String defaultModel() { return DEFAULT_MODEL; }
    @Override public boolean isAvailable() {
        return config.getDeepseekApiKey() != null && !config.getDeepseekApiKey().isBlank();
    }

    @Override
    public LlmResult complete(LlmRequest req) {
        if (!isAvailable()) throw new LlmException(0, "DEEPSEEK_API_KEY not set");
        String model = (req.model() == null || req.model().isBlank()) ? DEFAULT_MODEL : req.model();
        try {
            Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", req.maxOutputTokens(),
                "messages", List.of(
                    Map.of("role", "system", "content", req.system() == null ? "" : req.system()),
                    Map.of("role", "user", "content", req.user())
                )
            );
            HttpRequest request = HttpRequest.newBuilder(URI.create(URL))
                    .timeout(Duration.ofSeconds(120))
                    .header("Authorization", "Bearer " + config.getDeepseekApiKey())
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                    .build();
            HttpResponse<String> resp = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) {
                throw new LlmException(resp.statusCode(),
                        "DeepSeek " + resp.statusCode() + ": " + truncate(resp.body(), 500));
            }
            JsonNode root = json.readTree(resp.body());
            String content = root.path("choices").path(0).path("message").path("content").asText();
            int inTok  = root.path("usage").path("prompt_tokens").asInt();
            int outTok = root.path("usage").path("completion_tokens").asInt();
            return new LlmResult(content, inTok, outTok);
        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            throw new LlmException(0, "DeepSeek call failed: " + e.getMessage(), e);
        }
    }

    @Override
    public BigDecimal estimateCostUsd(int in, int out, String model) {
        return LlmCostTable.estimate(model, in, out);
    }

    private static String truncate(String s, int max) {
        return s == null ? "" : s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
