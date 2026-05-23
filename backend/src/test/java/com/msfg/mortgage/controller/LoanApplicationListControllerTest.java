package com.msfg.mortgage.controller;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.service.LoanApplicationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin@example.com", roles = "Admin")
@Transactional
class LoanApplicationListControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;
    @Autowired private LoanApplicationService loanApplicationService;

    private void seed(String first, String last) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose("Purchase"); dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("400000")); dto.setPropertyValue(new BigDecimal("500000"));

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("123 Main"); p.setCity("Lehi"); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence"); p.setPropertyValue(new BigDecimal("500000"));
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName(first); b.setLastName(last);
        b.setEmail(first.toLowerCase() + "@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));

        loanApplicationService.createApplication(dto);
    }

    @Test
    void listEndpoint_returnsPagedShape() throws Exception {
        seed("Matthew", "Fortney");
        seed("Veronica", "Sawaged");

        String body = mvc.perform(get("/api/loan-applications").contextPath("/api").param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").isNumber())
            .andExpect(jsonPath("$.totalPages").isNumber())
            .andExpect(jsonPath("$.page").value(0))
            .andExpect(jsonPath("$.size").value(10))
            .andReturn().getResponse().getContentAsString();

        JsonNode page = om.readTree(body);
        assertThat(page.get("totalElements").asLong()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void listEndpoint_appliesStatusFilter() throws Exception {
        seed("Matthew", "Fortney");
        seed("Veronica", "Sawaged");
        // Both default to REGISTERED. Filter by FUNDED → 0.

        mvc.perform(get("/api/loan-applications").contextPath("/api").param("status", "FUNDED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void searchEndpoint_returnsArrayOfHits() throws Exception {
        seed("Matthew", "Fortney");
        seed("Veronica", "Sawaged");

        mvc.perform(get("/api/loan-applications/search").contextPath("/api").param("q", "Fortney"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].borrowerName").value(org.hamcrest.Matchers.containsString("Fortney")));
    }

    @Test
    void searchEndpoint_shortQueryReturnsEmpty() throws Exception {
        seed("Matthew", "Fortney");

        mvc.perform(get("/api/loan-applications/search").contextPath("/api").param("q", "F"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
