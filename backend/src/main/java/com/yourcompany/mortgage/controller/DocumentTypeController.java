package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.model.DocumentType;
import com.yourcompany.mortgage.repository.DocumentTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/document-types")
@RequiredArgsConstructor
public class DocumentTypeController {

    private final DocumentTypeRepository documentTypeRepository;

    @GetMapping
    public ResponseEntity<?> listActive() {
        List<DocumentType> types = documentTypeRepository.findByIsActiveTrue();
        return ResponseEntity.ok(Map.of(
                "count", types.size(),
                "documentTypes", types.stream().map(this::toView).toList()));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<?> getBySlug(@PathVariable String slug) {
        DocumentType dt = documentTypeRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Document type '" + slug + "' not found"));
        return ResponseEntity.ok(toView(dt));
    }

    private Map<String, Object> toView(DocumentType dt) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", dt.getId());
        v.put("name", dt.getName());
        v.put("slug", dt.getSlug());
        v.put("defaultFolderName", dt.getDefaultFolderName());
        v.put("allowedMimeTypes", dt.getAllowedMimeTypes());
        v.put("maxFileSizeBytes", dt.getMaxFileSizeBytes());
        v.put("borrowerVisibleDefault", dt.getBorrowerVisibleDefault());
        v.put("sortOrder", dt.getSortOrder());
        return v;
    }
}
