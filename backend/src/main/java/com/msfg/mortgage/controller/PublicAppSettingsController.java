package com.msfg.mortgage.controller;

import com.msfg.mortgage.dto.AppSettingsPublicDTO;
import com.msfg.mortgage.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/app-settings/public")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class PublicAppSettingsController {

    private final AppSettingsRepository repo;

    @GetMapping
    public ResponseEntity<AppSettingsPublicDTO> get() {
        return ResponseEntity.ok(AppSettingsPublicDTO.from(repo.singleton()));
    }
}
