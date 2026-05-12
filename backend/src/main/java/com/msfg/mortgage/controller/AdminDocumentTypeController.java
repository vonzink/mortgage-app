package com.msfg.mortgage.controller;

import com.msfg.mortgage.exception.BusinessValidationException;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.model.DocumentType;
import com.msfg.mortgage.repository.DocumentTypeRepository;
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
@RequestMapping("/admin/document-types")
@RequiredArgsConstructor
@PreAuthorize("hasRole('Admin')")
public class AdminDocumentTypeController {

    private final DocumentTypeRepository documentTypeRepository;

    @GetMapping
    public ResponseEntity<?> listAll() {
        List<DocumentType> types = documentTypeRepository.findAll();
        types.sort((a, b) -> Integer.compare(
                a.getSortOrder() == null ? 0 : a.getSortOrder(),
                b.getSortOrder() == null ? 0 : b.getSortOrder()));
        return ResponseEntity.ok(Map.of(
                "count", types.size(),
                "documentTypes", types.stream().map(this::toView).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        DocumentType dt = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document type " + id + " not found"));
        return ResponseEntity.ok(toView(dt));
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody UpsertRequest req) {
        documentTypeRepository.findBySlug(req.slug()).ifPresent(existing -> {
            throw new BusinessValidationException("A document type with slug '" + req.slug() + "' already exists");
        });
        DocumentType dt = DocumentType.builder()
                .name(req.name())
                .slug(req.slug())
                .defaultFolderName(req.defaultFolderName())
                .requiredForMilestones(req.requiredForMilestones())
                .allowedMimeTypes(req.allowedMimeTypes())
                .maxFileSizeBytes(req.maxFileSizeBytes())
                .borrowerVisibleDefault(req.borrowerVisibleDefault() != null ? req.borrowerVisibleDefault() : true)
                .isActive(req.isActive() != null ? req.isActive() : true)
                .sortOrder(req.sortOrder() != null ? req.sortOrder() : 0)
                .build();
        return ResponseEntity.ok(toView(documentTypeRepository.save(dt)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UpsertRequest req) {
        DocumentType dt = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document type " + id + " not found"));

        if (!dt.getSlug().equals(req.slug())) {
            documentTypeRepository.findBySlug(req.slug()).ifPresent(existing -> {
                throw new BusinessValidationException("A document type with slug '" + req.slug() + "' already exists");
            });
        }

        dt.setName(req.name());
        dt.setSlug(req.slug());
        dt.setDefaultFolderName(req.defaultFolderName());
        dt.setRequiredForMilestones(req.requiredForMilestones());
        dt.setAllowedMimeTypes(req.allowedMimeTypes());
        dt.setMaxFileSizeBytes(req.maxFileSizeBytes());
        if (req.borrowerVisibleDefault() != null) dt.setBorrowerVisibleDefault(req.borrowerVisibleDefault());
        if (req.isActive() != null) dt.setIsActive(req.isActive());
        if (req.sortOrder() != null) dt.setSortOrder(req.sortOrder());

        return ResponseEntity.ok(toView(documentTypeRepository.save(dt)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deactivate(@PathVariable Long id) {
        DocumentType dt = documentTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document type " + id + " not found"));
        dt.setIsActive(false);
        documentTypeRepository.save(dt);
        return ResponseEntity.ok(Map.of("ok", true, "id", id));
    }

    private Map<String, Object> toView(DocumentType dt) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", dt.getId());
        v.put("name", dt.getName());
        v.put("slug", dt.getSlug());
        v.put("defaultFolderName", dt.getDefaultFolderName());
        v.put("requiredForMilestones", dt.getRequiredForMilestones());
        v.put("allowedMimeTypes", dt.getAllowedMimeTypes());
        v.put("maxFileSizeBytes", dt.getMaxFileSizeBytes());
        v.put("borrowerVisibleDefault", dt.getBorrowerVisibleDefault());
        v.put("isActive", dt.getIsActive());
        v.put("sortOrder", dt.getSortOrder());
        v.put("createdAt", dt.getCreatedAt());
        v.put("updatedAt", dt.getUpdatedAt());
        return v;
    }

    public record UpsertRequest(
            @NotBlank String name,
            @NotBlank String slug,
            String defaultFolderName,
            String requiredForMilestones,
            String allowedMimeTypes,
            Long maxFileSizeBytes,
            Boolean borrowerVisibleDefault,
            Boolean isActive,
            Integer sortOrder
    ) {}
}
