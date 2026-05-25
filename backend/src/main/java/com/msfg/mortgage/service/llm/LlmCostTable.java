package com.msfg.mortgage.service.llm;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Per-model $/M-token rates. Update as providers change pricing.
 * Estimator pattern: cost = (inputTokens / 1_000_000) * inputRate
 *                         + (outputTokens / 1_000_000) * outputRate
 */
public final class LlmCostTable {

    public record Rate(BigDecimal inputPerMTok, BigDecimal outputPerMTok) {}

    private static final Map<String, Rate> RATES = Map.of(
        // Anthropic
        "claude-sonnet-4-20250514",    new Rate(bd("3.00"),  bd("15.00")),
        "claude-3-5-sonnet-20241022",  new Rate(bd("3.00"),  bd("15.00")),
        // OpenAI
        "gpt-4o-mini",                 new Rate(bd("0.15"),  bd("0.60")),
        "gpt-4o",                      new Rate(bd("2.50"),  bd("10.00")),
        // DeepSeek
        "deepseek-chat",               new Rate(bd("0.27"),  bd("1.10"))
    );

    public static BigDecimal estimate(String model, int inputTokens, int outputTokens) {
        Rate r = RATES.get(model);
        if (r == null) return BigDecimal.ZERO;
        BigDecimal in  = bd(inputTokens).multiply(r.inputPerMTok())
                            .divide(bd("1000000"), 6, RoundingMode.HALF_UP);
        BigDecimal out = bd(outputTokens).multiply(r.outputPerMTok())
                            .divide(bd("1000000"), 6, RoundingMode.HALF_UP);
        return in.add(out).setScale(4, RoundingMode.HALF_UP);
    }

    private static BigDecimal bd(Object v) { return new BigDecimal(v.toString()); }
    private LlmCostTable() {}
}
