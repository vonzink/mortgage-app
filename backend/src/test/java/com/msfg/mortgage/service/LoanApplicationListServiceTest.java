package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.LoanListFilters;
import com.msfg.mortgage.dto.LoanListPage;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.model.LoanApplication;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LoanApplicationListServiceTest {

    @Autowired private LoanApplicationService loanApplicationService;
    @Autowired private LoanApplicationListService listService;
    @Autowired private JdbcTemplate jdbcTemplate;
    // JPA writes batch until flush; JdbcTemplate reads bypass the session.
    // Flush in tests so the view query sees the latest UPDATE.
    @PersistenceContext private EntityManager entityManager;

    @BeforeEach
    void cleanState() {
        // Other test classes (e.g. LoanApplicationServiceTest) are NOT
        // @Transactional and commit rows into the shared H2. Purge so each
        // test in this class starts from a known-empty state. Disable FK
        // checks across the truncates so we don't have to enumerate every
        // child table that may exist now or in the future.
        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");
        try {
            jdbcTemplate.update("DELETE FROM loan_applications");
        } finally {
            jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
        }
    }

    private LoanApplication appWith(String purpose, BigDecimal amount, BigDecimal value, String status) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose(purpose);
        dto.setLoanType("Conventional");
        dto.setLoanAmount(amount);
        dto.setPropertyValue(value);

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("123 Main");
        p.setCity("Lehi"); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence");
        p.setPropertyValue(value);
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName("Test"); b.setLastName("Borrower" + amount.intValue());
        b.setEmail("t@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));

        LoanApplication saved = loanApplicationService.createApplication(dto);
        if (status != null) loanApplicationService.updateApplicationStatus(saved.getId(), status, null);
        entityManager.flush();
        return saved;
    }

    @Test
    void list_returnsEmptyPageWhenNoLoansMatch() {
        LoanListFilters filters = LoanListFilters.defaults();
        LoanListPage page = listService.list(filters);
        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
        assertThat(page.page()).isZero();
        assertThat(page.size()).isEqualTo(25);
    }

    @Test
    void list_returnsCreatedLoan() {
        appWith("Purchase", new BigDecimal("400000"), new BigDecimal("500000"), null);
        LoanListPage page = listService.list(LoanListFilters.defaults());
        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).loanAmount()).isEqualByComparingTo("400000");
        assertThat(page.content().get(0).ltvPct()).isEqualTo(80.0);
        assertThat(page.content().get(0).borrowerName()).contains("Borrower");
    }

    @Test
    void list_filtersByStatus() {
        appWith("Purchase", new BigDecimal("300000"), new BigDecimal("400000"), "UNDERWRITING");
        appWith("Purchase", new BigDecimal("350000"), new BigDecimal("450000"), "APPLICATION");

        LoanListFilters filters = new LoanListFilters(
            List.of("UNDERWRITING"), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "createdDate", "desc", 0, 25
        );
        LoanListPage page = listService.list(filters);
        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).status()).isEqualTo("UNDERWRITING");
    }

    @Test
    void list_filtersByAmountRange() {
        appWith("Purchase", new BigDecimal("250000"), new BigDecimal("300000"), null);
        appWith("Purchase", new BigDecimal("550000"), new BigDecimal("700000"), null);
        appWith("Purchase", new BigDecimal("900000"), new BigDecimal("1000000"), null);

        LoanListFilters filters = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(),
            Optional.of(new BigDecimal("400000")),
            Optional.of(new BigDecimal("800000")),
            "createdDate", "desc", 0, 25
        );
        LoanListPage page = listService.list(filters);
        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).loanAmount()).isEqualByComparingTo("550000");
    }

    @Test
    void list_paginatesAndReportsTotals() {
        for (int i = 0; i < 7; i++) {
            appWith("Purchase", new BigDecimal(100000 + i * 1000), new BigDecimal("500000"), null);
        }
        LoanListFilters page0 = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "createdDate", "desc", 0, 3
        );
        LoanListPage result = listService.list(page0);
        assertThat(result.content()).hasSize(3);
        assertThat(result.totalElements()).isEqualTo(7);
        assertThat(result.totalPages()).isEqualTo(3);
        assertThat(result.page()).isZero();
        assertThat(result.size()).isEqualTo(3);
    }

    @Test
    void list_sortsByLoanAmountAsc() {
        appWith("Purchase", new BigDecimal("300000"), new BigDecimal("400000"), null);
        appWith("Purchase", new BigDecimal("100000"), new BigDecimal("200000"), null);
        appWith("Purchase", new BigDecimal("200000"), new BigDecimal("300000"), null);

        LoanListFilters filters = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "loanAmount", "asc", 0, 25
        );
        LoanListPage page = listService.list(filters);
        assertThat(page.content().stream().map(r -> r.loanAmount().intValue()).toList())
            .containsExactly(100000, 200000, 300000);
    }

    @Test
    void list_unknownSortFieldFallsBackToCreatedDateDesc() {
        appWith("Purchase", new BigDecimal("100000"), new BigDecimal("200000"), null);
        appWith("Purchase", new BigDecimal("200000"), new BigDecimal("300000"), null);

        LoanListFilters filters = new LoanListFilters(
            List.of(), Optional.empty(), Optional.empty(),
            Optional.empty(), Optional.empty(), Optional.empty(),
            List.of(), Optional.empty(), Optional.empty(),
            "DROP TABLE loan_applications", "desc", 0, 25
        );
        LoanListPage page = listService.list(filters);
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.content().get(0).loanAmount()).isEqualByComparingTo("200000"); // newer
    }
}
