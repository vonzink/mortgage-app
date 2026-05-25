package com.msfg.mortgage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Pulls LLM-related env vars / system properties under the {@code app.llm} prefix.
 * All values optional — adapters self-disable when their key is empty.
 */
@Component
@ConfigurationProperties(prefix = "app.llm")
public class LlmConfig {

    private String anthropicApiKey;
    private String openaiApiKey;
    private String deepseekApiKey;
    private boolean allowDeepseekInProd = false;
    private Integer monthlyUsdCap;
    private int perEvalTokenHardCap = 100_000;
    private int maxPagesPerEval = 150;

    public String getAnthropicApiKey() { return anthropicApiKey; }
    public void setAnthropicApiKey(String v) { anthropicApiKey = v; }
    public String getOpenaiApiKey() { return openaiApiKey; }
    public void setOpenaiApiKey(String v) { openaiApiKey = v; }
    public String getDeepseekApiKey() { return deepseekApiKey; }
    public void setDeepseekApiKey(String v) { deepseekApiKey = v; }
    public boolean isAllowDeepseekInProd() { return allowDeepseekInProd; }
    public void setAllowDeepseekInProd(boolean v) { allowDeepseekInProd = v; }
    public Integer getMonthlyUsdCap() { return monthlyUsdCap; }
    public void setMonthlyUsdCap(Integer v) { monthlyUsdCap = v; }
    public int getPerEvalTokenHardCap() { return perEvalTokenHardCap; }
    public void setPerEvalTokenHardCap(int v) { perEvalTokenHardCap = v; }
    public int getMaxPagesPerEval() { return maxPagesPerEval; }
    public void setMaxPagesPerEval(int v) { maxPagesPerEval = v; }
}
