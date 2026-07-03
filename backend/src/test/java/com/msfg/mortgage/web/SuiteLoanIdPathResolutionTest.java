package com.msfg.mortgage.web;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import com.msfg.mortgage.service.LoanApplicationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Loans that live in the msfg-suite (system of record) are navigated by their suite UUID,
 * but this backend keys everything by the numeric legacy id. Any /loan-applications/{id}/**
 * URL reached with a suite UUID must transparently resolve to the linked legacy row via
 * loan_applications.suite_loan_id — previously it blew up as
 * MethodArgumentTypeMismatchException → 500 "An unexpected error occurred"
 * (prod incident 2026-07-03: PUT /loan-applications/{uuid} and GET .../export/mismo).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin@example.com", roles = "Admin")
@Transactional
class SuiteLoanIdPathResolutionTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;
    @Autowired private LoanApplicationService loanApplicationService;
    @Autowired private LoanApplicationRepository loanApplicationRepository;

    private LoanApplicationDTO dto(String first, String last, String amount) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose("Purchase"); dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal(amount)); dto.setPropertyValue(new BigDecimal("500000"));

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("123 Main"); p.setCity("Lehi"); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence"); p.setPropertyValue(new BigDecimal("500000"));
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName(first); b.setLastName(last);
        b.setEmail(first.toLowerCase() + "@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));
        return dto;
    }

    /** Seed a legacy loan linked to a suite loan; returns the legacy entity. */
    private LoanApplication seedLinked(String suiteLoanId) {
        LoanApplication app = loanApplicationService.createApplication(dto("Matthew", "Fortney", "400000"));
        app.setSuiteLoanId(suiteLoanId);
        return loanApplicationRepository.saveAndFlush(app);
    }

    @Test
    void getBySuiteUuid_resolvesToLinkedLegacyRecord() throws Exception {
        String uuid = UUID.randomUUID().toString();
        LoanApplication app = seedLinked(uuid);

        mvc.perform(get("/api/loan-applications/" + uuid).contextPath("/api"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(app.getId()))
            .andExpect(jsonPath("$.suiteLoanId").value(uuid));
    }

    @Test
    void getByUnknownSuiteUuid_returns404NotFound_not500() throws Exception {
        mvc.perform(get("/api/loan-applications/" + UUID.randomUUID()).contextPath("/api"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void getByNumericLegacyId_isUnaffected() throws Exception {
        LoanApplication app = seedLinked(UUID.randomUUID().toString());

        mvc.perform(get("/api/loan-applications/" + app.getId()).contextPath("/api"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(app.getId()));
    }

    @Test
    void subResourcePathsAfterUuid_areRewrittenToo() throws Exception {
        String uuid = UUID.randomUUID().toString();
        seedLinked(uuid);

        // Status-history is the simplest {id}-scoped sub-resource behind loanAccessGuard.
        mvc.perform(get("/api/loan-applications/" + uuid + "/status-history").contextPath("/api"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    void putBySuiteUuid_updatesTheLinkedLegacyRecord() throws Exception {
        String uuid = UUID.randomUUID().toString();
        LoanApplication app = seedLinked(uuid);

        LoanApplicationDTO update = dto("Matthew", "Fortney", "425000");
        mvc.perform(put("/api/loan-applications/" + uuid).contextPath("/api")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(update)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(app.getId()))
            .andExpect(jsonPath("$.loanAmount").value(425000));
    }

    @Test
    void exportMismoBySuiteUuid_returnsXml() throws Exception {
        String uuid = UUID.randomUUID().toString();
        seedLinked(uuid);

        mvc.perform(get("/api/loan-applications/" + uuid + "/export/mismo").contextPath("/api"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("xml")));
    }

    @Test
    void nonUuidNonNumericSegments_passThroughUntouched() throws Exception {
        // "search" is a literal segment under /loan-applications — must not be treated as an id.
        mvc.perform(get("/api/loan-applications/search").contextPath("/api").param("q", "Fortney"))
            .andExpect(status().isOk());
    }
}
