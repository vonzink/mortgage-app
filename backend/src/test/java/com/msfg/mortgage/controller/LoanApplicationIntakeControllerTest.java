package com.msfg.mortgage.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LoanApplicationIntakeControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;

    private static final String BODY = """
        { "sourceLeadId":"lead-ctrl-1","source":"apply-wizard","intent":"refi","loanPurpose":"Refinance",
          "borrower":{"firstName":"Zachary","lastName":"Zink","email":"borrower@example.com","phone":"3035551234"},
          "property":{"addressLine":"12750 W 88th Ave","city":"Arvada","state":"CO","zipCode":"80005",
                      "propertyType":"PrimaryResidence","constructionType":"SiteBuilt","propertyValue":485000},
          "financials":{"currentMortgageBalance":312000,"annualIncome":120000,"creditBand":"Good"},
          "loanOfficer":null }
        """;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor borrowerJwt() {
        return jwt().jwt(j -> j.subject("sub-borrower")
                              .claim("email", "borrower@example.com")
                              .claim("name", "Zachary Zink")
                              .claim("cognito:groups", java.util.List.of("Borrower")))
                    .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_Borrower"));
    }

    @Test
    void unauthenticatedIs401() throws Exception {
        mvc.perform(post("/loan-applications/intake").contentType(MediaType.APPLICATION_JSON).content(BODY))
           .andExpect(status().isUnauthorized());
    }

    @Test
    void createsApplicationAndReturnsId() throws Exception {
        MvcResult res = mvc.perform(post("/loan-applications/intake")
                .with(borrowerJwt()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andReturn();
        JsonNode body = om.readTree(res.getResponse().getContentAsString());
        assertThat(body.get("applicationId").asLong()).isPositive();
    }

    @Test
    void idempotentReturnsSameId() throws Exception {
        MvcResult a = mvc.perform(post("/loan-applications/intake")
                .with(borrowerJwt()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andReturn();
        MvcResult b = mvc.perform(post("/loan-applications/intake")
                .with(borrowerJwt()).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andReturn();
        long idA = om.readTree(a.getResponse().getContentAsString()).get("applicationId").asLong();
        long idB = om.readTree(b.getResponse().getContentAsString()).get("applicationId").asLong();
        assertThat(idB).isEqualTo(idA);
    }
}
