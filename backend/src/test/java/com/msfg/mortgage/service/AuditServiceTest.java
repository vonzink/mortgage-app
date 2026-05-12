package com.msfg.mortgage.service;

import com.msfg.mortgage.model.AuditLog;
import com.msfg.mortgage.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Audit log is the compliance backbone — every document/folder action must
 * leave a row, and the metadata blob must be replayable. These tests cover the
 * happy path (writes succeed, fields round-trip) and the resilience path
 * (audit failure must NOT throw and break the parent operation).
 */
@SpringBootTest
@ActiveProfiles("test")
class AuditServiceTest {

    @Autowired private AuditService auditService;
    @Autowired private AuditLogRepository auditLogRepository;

    private HttpServletRequest mockRequest(String ip) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(ip);
        return req;
    }

    private HttpServletRequest mockRequestWithForwardedFor(String forwarded) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("X-Forwarded-For", forwarded);
        return req;
    }

    @Test
    void logDocumentAction_writesRow() {
        // Unique loan id per test run so we don't collide with seed/other tests
        long loanId = 100_000L + System.nanoTime() % 1000;

        auditService.logDocumentAction(loanId, 42L, "UPLOAD",
                7, "lo",
                Map.of("fileName", "paystub.pdf", "fileSize", 1234L),
                mockRequest("10.0.0.1"));

        List<AuditLog> rows = auditLogRepository.findByLoanIdAndAction(loanId, "UPLOAD");
        assertThat(rows).hasSize(1);
        AuditLog row = rows.get(0);
        assertThat(row.getEntityType()).isEqualTo("DOCUMENT");
        assertThat(row.getEntityId()).isEqualTo(42L);
        assertThat(row.getUserId()).isEqualTo(7);
        assertThat(row.getUserRole()).isEqualTo("lo");
        assertThat(row.getIpAddress()).isEqualTo("10.0.0.1");
        assertThat(row.getMetadataJson()).contains("paystub.pdf");
    }

    @Test
    void logFolderAction_setsCorrectEntityType() {
        long loanId = 200_000L + System.nanoTime() % 1000;

        auditService.logFolderAction(loanId, 7L, "MOVE",
                3, "processor",
                Map.of("toFolderId", 9),
                mockRequest("127.0.0.1"));

        List<AuditLog> rows = auditLogRepository.findByLoanIdAndAction(loanId, "MOVE");
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getEntityType()).isEqualTo("FOLDER");
    }

    @Test
    void ipResolution_prefersXForwardedFor() {
        long loanId = 300_000L + System.nanoTime() % 1000;

        auditService.logDocumentAction(loanId, 1L, "DOWNLOAD",
                1, "lo", Map.of(),
                mockRequestWithForwardedFor("203.0.113.42, 10.0.0.1"));

        AuditLog row = auditLogRepository.findByLoanIdAndAction(loanId, "DOWNLOAD").get(0);
        // First IP in the comma-separated list is the original client
        assertThat(row.getIpAddress()).isEqualTo("203.0.113.42");
    }

    @Test
    void emptyMetadataDoesNotProduceEmptyJson() {
        long loanId = 400_000L + System.nanoTime() % 1000;

        auditService.logDocumentAction(loanId, 1L, "VIEW",
                1, "borrower", Map.of(),
                mockRequest("10.0.0.5"));

        AuditLog row = auditLogRepository.findByLoanIdAndAction(loanId, "VIEW").get(0);
        // Empty maps shouldn't serialize as "{}" — they should remain null so
        // queries on metadata don't get false positives.
        assertThat(row.getMetadataJson()).isNull();
    }

    @Test
    void nullRequestDoesNotThrow() {
        long loanId = 500_000L + System.nanoTime() % 1000;

        // Audit calls outside an HTTP context (e.g. background job) shouldn't blow up.
        auditService.logDocumentAction(loanId, 1L, "STATUS_CHANGE",
                null, null, Map.of("from", "UPLOADED", "to", "READY_FOR_REVIEW"),
                null);

        AuditLog row = auditLogRepository.findByLoanIdAndAction(loanId, "STATUS_CHANGE").get(0);
        assertThat(row.getIpAddress()).isNull();
    }

    @Test
    void findByLoanIdOrderByCreatedAtDesc_returnsNewestFirst() {
        long loanId = 600_000L + System.nanoTime() % 1000;

        auditService.logDocumentAction(loanId, 1L, "UPLOAD",   1, "lo", Map.of(), mockRequest("1.1.1.1"));
        auditService.logDocumentAction(loanId, 1L, "DOWNLOAD", 1, "lo", Map.of(), mockRequest("1.1.1.1"));

        List<AuditLog> page = auditLogRepository
                .findByLoanIdOrderByCreatedAtDesc(loanId, PageRequest.of(0, 10))
                .getContent();

        // DOWNLOAD logged second → should appear first in the descending order
        assertThat(page).hasSizeGreaterThanOrEqualTo(2);
        assertThat(page.get(0).getAction()).isEqualTo("DOWNLOAD");
    }
}
