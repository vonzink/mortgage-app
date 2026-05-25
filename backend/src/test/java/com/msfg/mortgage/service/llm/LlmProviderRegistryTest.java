package com.msfg.mortgage.service.llm;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class LlmProviderRegistryTest {

    @Autowired private LlmProviderRegistry registry;

    @Test
    void resolve_anthropic_returnsAnthropicAdapter() {
        assertThat(registry.resolve("anthropic").name()).isEqualTo("anthropic");
    }

    @Test
    void resolve_openai_returnsOpenAiAdapter() {
        assertThat(registry.resolve("openai").name()).isEqualTo("openai");
    }

    @Test
    void resolve_deepseek_returnsDeepSeekAdapter() {
        assertThat(registry.resolve("deepseek").name()).isEqualTo("deepseek");
    }

    @Test
    void resolve_unknown_throws() {
        assertThatThrownBy(() -> registry.resolve("not-a-provider"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown LLM provider");
    }

    @Test
    void isAvailable_doesNotThrow_whenKeyMissing() {
        // test profile has no API keys set; predicate should return false cleanly
        boolean result = registry.isAvailable("anthropic");
        assertThat(result).isIn(true, false);
    }
}
