package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.IntakeRequest;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.model.LoanStatus;
import com.msfg.mortgage.model.User;
import com.msfg.mortgage.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LoanApplicationIntakeServiceTest {

    @Autowired private LoanApplicationService service;
    @Autowired private UserRepository userRepository;

    private IntakeRequest sampleRefi(String leadId) {
        IntakeRequest r = new IntakeRequest();
        r.setSourceLeadId(leadId);
        r.setSource("apply-wizard");
        r.setIntent("refi");
        r.setLoanPurpose("Refinance");
        IntakeRequest.BorrowerInfo b = new IntakeRequest.BorrowerInfo();
        b.setFirstName("Zachary"); b.setLastName("Zink");
        b.setEmail("borrower@example.com"); b.setPhone("3035551234");
        r.setBorrower(b);
        IntakeRequest.PropertyInfo p = new IntakeRequest.PropertyInfo();
        p.setAddressLine("12750 W 88th Ave"); p.setCity("Arvada"); p.setState("CO"); p.setZipCode("80005");
        p.setPropertyType("PrimaryResidence"); p.setConstructionType("SiteBuilt");
        p.setPropertyValue(new BigDecimal("485000"));
        r.setProperty(p);
        IntakeRequest.Financials f = new IntakeRequest.Financials();
        f.setCurrentMortgageBalance(new BigDecimal("312000")); f.setAnnualIncome(new BigDecimal("120000"));
        f.setCreditBand("Good (680–739)");
        r.setFinancials(f);
        return r;
    }

    private User borrower() {
        return userRepository.save(User.builder()
                .email("borrower@example.com").name("Zachary Zink").role("borrower")
                .cognitoSub("sub-borrower").build());
    }

    @Test
    void createsRegisteredApplicationOwnedByCaller() {
        User caller = borrower();
        LoanApplication app = service.createFromIntake(sampleRefi("lead-1"), caller);
        assertThat(app.getId()).isNotNull();
        assertThat(app.getStatus()).isEqualTo(LoanStatus.REGISTERED.name());
        assertThat(app.getLoanPurpose()).isEqualTo("Refinance");
        assertThat(app.getSourceLeadId()).isEqualTo("lead-1");
        assertThat(app.getProperty().getAddressLine()).isEqualTo("12750 W 88th Ave");
        assertThat(app.getBorrowers()).hasSize(1);
        assertThat(app.getBorrowers().get(0).getEmail()).isEqualTo("borrower@example.com");
        assertThat(app.getBorrowers().get(0).getUserId()).isEqualTo(caller.getId());
        assertThat(app.getLiabilities()).anyMatch(l -> "MortgageLoan".equals(l.getLiabilityType()));
    }

    @Test
    void idempotentOnSourceLeadId() {
        User caller = borrower();
        LoanApplication first = service.createFromIntake(sampleRefi("lead-2"), caller);
        LoanApplication second = service.createFromIntake(sampleRefi("lead-2"), caller);
        assertThat(second.getId()).isEqualTo(first.getId());
    }

    @Test
    void resolvesLoanOfficerByEmail() {
        User caller = borrower();
        User lo = userRepository.save(User.builder()
                .email("zachary.zink@msfg.us").name("Zachary Zink").role("lo").cognitoSub("sub-lo").build());
        IntakeRequest r = sampleRefi("lead-3");
        IntakeRequest.LoanOfficerInfo info = new IntakeRequest.LoanOfficerInfo();
        info.setEmail("zachary.zink@msfg.us"); info.setName("Zachary Zink"); info.setNmls("451924");
        r.setLoanOfficer(info);
        LoanApplication app = service.createFromIntake(r, caller);
        assertThat(app.getAssignedLoId()).isEqualTo(lo.getId());
        assertThat(app.getAssignedLoName()).isEqualTo("Zachary Zink");
    }

    @Test
    void unknownLoanOfficerLeavesUnassigned() {
        User caller = borrower();
        IntakeRequest r = sampleRefi("lead-4");
        IntakeRequest.LoanOfficerInfo info = new IntakeRequest.LoanOfficerInfo();
        info.setEmail("nobody@msfg.us"); info.setName("Nobody");
        r.setLoanOfficer(info);
        LoanApplication app = service.createFromIntake(r, caller);
        assertThat(app.getAssignedLoId()).isNull();
    }

    @Test
    void emptyAddressFieldsCoercedToNull() {
        User caller = borrower();
        IntakeRequest r = sampleRefi("lead-6");
        IntakeRequest.PropertyInfo p = new IntakeRequest.PropertyInfo();
        p.setAddressLine("Address to be determined");
        p.setCity("");
        p.setState("");
        p.setZipCode("");
        p.setPropertyType("PrimaryResidence");
        p.setPropertyValue(new java.math.BigDecimal("300000"));
        r.setProperty(p);
        LoanApplication app = service.createFromIntake(r, caller);
        assertThat(app.getProperty().getAddressLine()).isEqualTo("Address to be determined");
        assertThat(app.getProperty().getCity()).isNull();
        assertThat(app.getProperty().getState()).isNull();
        assertThat(app.getProperty().getZipCode()).isNull();
    }

    @Test
    void buyIntakeWithoutMortgageHasNoLiability() {
        User caller = borrower();
        IntakeRequest r = sampleRefi("lead-5");
        r.setIntent("buy");
        r.setLoanPurpose("Purchase");
        r.getFinancials().setCurrentMortgageBalance(null); // purchase has no existing mortgage
        LoanApplication app = service.createFromIntake(r, caller);
        assertThat(app.getStatus()).isEqualTo(LoanStatus.REGISTERED.name());
        assertThat(app.getLoanPurpose()).isEqualTo("Purchase");
        // no MortgageLoan liability created when there's no current mortgage balance
        assertThat(app.getLiabilities() == null || app.getLiabilities().isEmpty()).isTrue();
    }
}
