package com.msfg.mortgage.controller;

import com.msfg.mortgage.dto.AppSettingsDTO;
import com.msfg.mortgage.model.AppSettings;
import com.msfg.mortgage.repository.AppSettingsRepository;
import com.msfg.mortgage.service.llm.LlmProviderRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/admin/app-settings")
@PreAuthorize("hasRole('Admin')")
@RequiredArgsConstructor
public class AdminAppSettingsController {

    private static final Set<String> ALLOWED_PROVIDERS = Set.of("anthropic", "openai", "deepseek");

    private final AppSettingsRepository repo;
    private final LlmProviderRegistry registry;

    @GetMapping
    public ResponseEntity<AppSettingsDTO> get() {
        return ResponseEntity.ok(AppSettingsDTO.from(repo.singleton()));
    }

    public record UpdateRequest(Boolean aiEvalEnabled, String llmDefaultProvider, String llmDefaultModel) {}

    @PutMapping
    public ResponseEntity<?> update(@RequestBody UpdateRequest req) {
        if (req.llmDefaultProvider() != null && !ALLOWED_PROVIDERS.contains(req.llmDefaultProvider())) {
            return ResponseEntity.badRequest().body(
                java.util.Map.of("error", "Unknown provider: " + req.llmDefaultProvider()));
        }
        AppSettings s = repo.singleton();
        if (req.aiEvalEnabled() != null)      s.setAiEvalEnabled(req.aiEvalEnabled());
        if (req.llmDefaultProvider() != null) s.setLlmDefaultProvider(req.llmDefaultProvider());
        if (req.llmDefaultModel() != null)    s.setLlmDefaultModel(req.llmDefaultModel());
        return ResponseEntity.ok(AppSettingsDTO.from(repo.save(s)));
    }
}
