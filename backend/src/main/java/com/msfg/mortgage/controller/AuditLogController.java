package com.msfg.mortgage.controller;

import com.msfg.mortgage.model.AuditLog;
import com.msfg.mortgage.model.Document;
import com.msfg.mortgage.repository.AuditLogRepository;
import com.msfg.mortgage.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/loan-applications/{loanId}")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;
    private final DocumentService documentService;

    @GetMapping("/audit-log")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> getAuditLog(
            @PathVariable Long loanId,
            @RequestParam(value = "entityType", required = false) String entityType,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 200));
        Page<AuditLog> results = auditLogRepository.findFiltered(loanId, entityType, action, pageable);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("totalElements", results.getTotalElements());
        body.put("totalPages", results.getTotalPages());
        body.put("page", results.getNumber());
        body.put("size", results.getSize());
        body.put("entries", results.getContent().stream().map(this::toView).toList());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/documents/{docUuid}/history")
    @PreAuthorize("hasAnyRole('LO','Processor','Admin','Manager') and @loanAccessGuard.canAccess(#loanId)")
    public ResponseEntity<?> getDocumentHistory(
            @PathVariable Long loanId,
            @PathVariable String docUuid
    ) {
        Document doc = documentService.findByUuidAndLoan(docUuid, loanId);
        List<AuditLog> entries = auditLogRepository.findByEntity("DOCUMENT", doc.getId());
        return ResponseEntity.ok(Map.of(
                "docUuid", docUuid,
                "count", entries.size(),
                "entries", entries.stream().map(this::toView).toList()));
    }

    private Map<String, Object> toView(AuditLog entry) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", entry.getId());
        v.put("entityType", entry.getEntityType());
        v.put("entityId", entry.getEntityId());
        v.put("action", entry.getAction());
        v.put("userId", entry.getUserId());
        v.put("userRole", entry.getUserRole());
        v.put("loanId", entry.getLoanId());
        v.put("metadata", entry.getMetadataJson());
        v.put("ipAddress", entry.getIpAddress());
        v.put("createdAt", entry.getCreatedAt());
        return v;
    }
}
