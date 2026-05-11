package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.exception.BusinessValidationException;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.FolderTemplate;
import com.yourcompany.mortgage.repository.FolderTemplateRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/folder-templates")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Admin')")
public class AdminFolderTemplateController {

    private final FolderTemplateRepository folderTemplateRepository;

    @GetMapping
    public ResponseEntity<?> listAll() {
        List<FolderTemplate> templates = folderTemplateRepository.findAllOrdered();
        return ResponseEntity.ok(Map.of(
                "count", templates.size(),
                "folderTemplates", templates.stream().map(this::toView).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        FolderTemplate t = folderTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Folder template " + id + " not found"));
        return ResponseEntity.ok(toView(t));
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody UpsertRequest req) {
        folderTemplateRepository.findByDisplayName(req.displayName()).ifPresent(existing -> {
            throw new BusinessValidationException("A folder template named '" + req.displayName() + "' already exists");
        });
        FolderTemplate t = FolderTemplate.builder()
                .displayName(req.displayName().trim())
                .sortKey(req.sortKey())
                .isOldLoanArchive(Boolean.TRUE.equals(req.isOldLoanArchive()))
                .isDeleteFolder(Boolean.TRUE.equals(req.isDeleteFolder()))
                .isActive(req.isActive() == null || req.isActive())
                .sortOrder(req.sortOrder() != null ? req.sortOrder() : 0)
                .build();
        validateSingletons(t, null);
        return ResponseEntity.ok(toView(folderTemplateRepository.save(t)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UpsertRequest req) {
        FolderTemplate t = folderTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Folder template " + id + " not found"));

        if (!t.getDisplayName().equalsIgnoreCase(req.displayName().trim())) {
            folderTemplateRepository.findByDisplayName(req.displayName().trim()).ifPresent(existing -> {
                throw new BusinessValidationException("A folder template named '" + req.displayName() + "' already exists");
            });
        }

        t.setDisplayName(req.displayName().trim());
        t.setSortKey(req.sortKey());
        if (req.isOldLoanArchive() != null) t.setIsOldLoanArchive(req.isOldLoanArchive());
        if (req.isDeleteFolder() != null) t.setIsDeleteFolder(req.isDeleteFolder());
        if (req.isActive() != null) t.setIsActive(req.isActive());
        if (req.sortOrder() != null) t.setSortOrder(req.sortOrder());

        validateSingletons(t, id);
        return ResponseEntity.ok(toView(folderTemplateRepository.save(t)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deactivate(@PathVariable Long id) {
        FolderTemplate t = folderTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Folder template " + id + " not found"));
        if (Boolean.TRUE.equals(t.getIsDeleteFolder())) {
            throw new BusinessValidationException("The Delete folder template is required and cannot be deactivated");
        }
        t.setIsActive(false);
        folderTemplateRepository.save(t);
        return ResponseEntity.ok(Map.of("ok", true, "id", id));
    }

    /**
     * The Delete folder and Old Loan Archive are singletons by design — the rest of the
     * codebase looks them up by flag, not by name. Enforce uniqueness here to avoid
     * silent ambiguity at runtime.
     */
    private void validateSingletons(FolderTemplate candidate, Long excludeId) {
        List<FolderTemplate> all = folderTemplateRepository.findAll();
        if (Boolean.TRUE.equals(candidate.getIsDeleteFolder())) {
            boolean collision = all.stream()
                    .filter(o -> excludeId == null || !o.getId().equals(excludeId))
                    .anyMatch(o -> Boolean.TRUE.equals(o.getIsDeleteFolder()));
            if (collision) throw new BusinessValidationException("Another folder template is already marked as the Delete folder");
        }
        if (Boolean.TRUE.equals(candidate.getIsOldLoanArchive())) {
            boolean collision = all.stream()
                    .filter(o -> excludeId == null || !o.getId().equals(excludeId))
                    .anyMatch(o -> Boolean.TRUE.equals(o.getIsOldLoanArchive()));
            if (collision) throw new BusinessValidationException("Another folder template is already marked as the Old Loan Archive");
        }
    }

    private Map<String, Object> toView(FolderTemplate t) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", t.getId());
        v.put("displayName", t.getDisplayName());
        v.put("sortKey", t.getSortKey());
        v.put("isOldLoanArchive", t.getIsOldLoanArchive());
        v.put("isDeleteFolder", t.getIsDeleteFolder());
        v.put("isActive", t.getIsActive());
        v.put("sortOrder", t.getSortOrder());
        v.put("createdAt", t.getCreatedAt());
        v.put("updatedAt", t.getUpdatedAt());
        return v;
    }

    public record UpsertRequest(
            @NotBlank String displayName,
            String sortKey,
            Boolean isOldLoanArchive,
            Boolean isDeleteFolder,
            Boolean isActive,
            Integer sortOrder
    ) {}
}
