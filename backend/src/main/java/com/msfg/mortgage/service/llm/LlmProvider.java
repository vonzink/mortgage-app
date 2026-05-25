package com.msfg.mortgage.service.llm;

import java.math.BigDecimal;

/**
 * Pluggable LLM backend. Adapters speak HTTP to provider APIs.
 *
 * <p>Adapters are constructed lazily: a missing API key marks the adapter as
 * unavailable rather than failing app boot, so devs can run the app with
 * only one of the three keys set.
 */
public interface LlmProvider {

    /** Lowercase short name. Matches {@code app_settings.llm_default_provider}. */
    String name();

    /** Model name sent when the request's model is null/blank. */
    String defaultModel();

    /** True when this adapter has the secrets / permissions it needs to call out. */
    boolean isAvailable();

    /**
     * Synchronous completion call. Throws {@link LlmException} on any failure
     * including HTTP non-2xx, network errors, malformed responses.
     */
    LlmResult complete(LlmRequest req);

    /**
     * Cost in USD for the given (model, input, output) token counts.
     * Returns 0 if model is unknown.
     */
    BigDecimal estimateCostUsd(int inputTokens, int outputTokens, String model);

    record LlmRequest(String system, String user, int maxOutputTokens, String model) {}
    record LlmResult(String content, int inputTokens, int outputTokens) {}
}
