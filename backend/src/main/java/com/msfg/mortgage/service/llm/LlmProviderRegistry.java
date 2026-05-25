package com.msfg.mortgage.service.llm;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LlmProviderRegistry {

    private final Map<String, LlmProvider> byName;

    public LlmProviderRegistry(List<LlmProvider> providers) {
        this.byName = providers.stream()
                .collect(Collectors.toMap(LlmProvider::name, p -> p));
    }

    /** Returns the adapter or throws if no provider with that name is registered. */
    public LlmProvider resolve(String name) {
        LlmProvider p = byName.get(name);
        if (p == null) {
            throw new IllegalArgumentException("Unknown LLM provider: " + name);
        }
        return p;
    }

    public boolean isAvailable(String name) {
        LlmProvider p = byName.get(name);
        return p != null && p.isAvailable();
    }
}
