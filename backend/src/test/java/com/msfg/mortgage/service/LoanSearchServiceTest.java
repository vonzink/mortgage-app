package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.BorrowerDTO;
import com.msfg.mortgage.dto.LoanApplicationDTO;
import com.msfg.mortgage.dto.LoanSearchHit;
import com.msfg.mortgage.dto.PropertyDTO;
import com.msfg.mortgage.model.LoanApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LoanSearchServiceTest {

    @Autowired private LoanApplicationService loanApplicationService;
    @Autowired private LoanSearchService searchService;

    private LoanApplication seedLoan(String first, String last, String city) {
        LoanApplicationDTO dto = new LoanApplicationDTO();
        dto.setLoanPurpose("Purchase");
        dto.setLoanType("Conventional");
        dto.setLoanAmount(new BigDecimal("400000"));
        dto.setPropertyValue(new BigDecimal("500000"));

        PropertyDTO p = new PropertyDTO();
        p.setAddressLine("123 Main"); p.setCity(city); p.setState("UT"); p.setZipCode("84043");
        p.setPropertyType("PrimaryResidence");
        p.setPropertyValue(new BigDecimal("500000"));
        dto.setProperty(p);

        BorrowerDTO b = new BorrowerDTO();
        b.setFirstName(first); b.setLastName(last);
        b.setEmail(first.toLowerCase() + "@example.com"); b.setSequenceNumber(1);
        dto.setBorrowers(List.of(b));

        return loanApplicationService.createApplication(dto);
    }

    @Test
    void search_returnsEmptyForBlankQuery() {
        List<LoanSearchHit> hits = searchService.search("", 10);
        assertThat(hits).isEmpty();
    }

    @Test
    void search_returnsEmptyForOneCharQuery() {
        seedLoan("Fortney", "Matthew", "Lehi");
        List<LoanSearchHit> hits = searchService.search("F", 10);
        assertThat(hits).isEmpty();
    }

    @Test
    void search_matchesBorrowerLastName() {
        seedLoan("Matthew", "Fortney", "Lehi");
        seedLoan("Veronica", "Sawaged", "Provo");

        List<LoanSearchHit> hits = searchService.search("Fortney", 10);

        assertThat(hits).hasSize(1);
        assertThat(hits.get(0).borrowerName()).contains("Fortney");
        assertThat(hits.get(0).city()).isEqualTo("Lehi");
    }

    @Test
    void search_isCaseInsensitive() {
        seedLoan("Matthew", "Fortney", "Lehi");
        List<LoanSearchHit> hits = searchService.search("FORTNEY", 10);
        assertThat(hits).hasSize(1);
    }

    @Test
    void search_matchesApplicationNumberPrefix() {
        LoanApplication la = seedLoan("Anna", "Chen", "Park City");
        // applicationNumber is like APPnnnnnn — first 4 chars = "APPn"
        String prefix = la.getApplicationNumber().substring(0, 4);
        List<LoanSearchHit> hits = searchService.search(prefix, 10);
        assertThat(hits).extracting(LoanSearchHit::id).contains(la.getId());
    }

    @Test
    void search_respectsLimit() {
        for (int i = 0; i < 6; i++) seedLoan("Rep" + i, "Tester", "City" + i);
        List<LoanSearchHit> hits = searchService.search("Tester", 3);
        assertThat(hits).hasSize(3);
    }
}
