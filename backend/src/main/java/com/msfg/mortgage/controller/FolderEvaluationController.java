package com.msfg.mortgage.controller;

import com.msfg.mortgage.dto.FolderEvaluationDTO;
import com.msfg.mortgage.security.CurrentUserService;
import com.msfg.mortgage.service.FolderEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/loan-applications/{loanId}/folders/{folderTemplateId}")
@RequiredArgsConstructor
public class FolderEvaluationController {

    private final FolderEvaluationService service;
    private final CurrentUserService currentUser;

    @PostMapping("/evaluate")
    @PreAuthorize("@loanAccessGuard.isInternal() and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<FolderEvaluationDTO> evaluate(
            @PathVariable Long loanId,
            @PathVariable Long folderTemplateId) {
        Integer userId = currentUser.currentUser().map(u -> u.getId()).orElse(null);
        return ResponseEntity.ok(FolderEvaluationDTO.from(
                service.evaluate(loanId, folderTemplateId, userId)));
    }

    @GetMapping("/evaluation")
    @PreAuthorize("@loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<FolderEvaluationDTO> latest(
            @PathVariable Long loanId,
            @PathVariable Long folderTemplateId) {
        return service.latestFor(loanId, folderTemplateId)
                .map(e -> ResponseEntity.ok(FolderEvaluationDTO.from(e)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
