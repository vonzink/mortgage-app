package com.yourcompany.mortgage.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.mortgage.model.AuditLog;
import com.yourcompany.mortgage.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void logDocumentAction(Long loanId, Long documentId, String action,
                                   Integer userId, String userRole,
                                   Map<String, Object> metadata,
                                   HttpServletRequest request) {
        logAction("DOCUMENT", documentId, action, loanId, userId, userRole, metadata, request);
    }

    public void logFolderAction(Long loanId, Long folderId, String action,
                                 Integer userId, String userRole,
                                 Map<String, Object> metadata,
                                 HttpServletRequest request) {
        logAction("FOLDER", folderId, action, loanId, userId, userRole, metadata, request);
    }

    private void logAction(String entityType, Long entityId, String action,
                            Long loanId, Integer userId, String userRole,
                            Map<String, Object> metadata,
                            HttpServletRequest request) {
        try {
            String metadataJson = null;
            if (metadata != null && !metadata.isEmpty()) {
                metadataJson = objectMapper.writeValueAsString(metadata);
            }

            AuditLog entry = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .loanId(loanId)
                    .userId(userId)
                    .userRole(userRole)
                    .metadataJson(metadataJson)
                    .ipAddress(resolveIp(request))
                    .build();

            auditLogRepository.save(entry);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize audit metadata for {} {} on loan {}: {}",
                    action, entityType, loanId, e.getMessage());
        } catch (Exception e) {
            log.error("Failed to write audit log for {} {} on loan {}: {}",
                    action, entityType, loanId, e.getMessage());
        }
    }

    private static String resolveIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
