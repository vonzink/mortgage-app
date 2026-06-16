package com.msfg.mortgage.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import lombok.Data;

/**
 * Borrower-funnel intake payload from msfg.us (POST /loan-applications/intake).
 * Intentionally decoupled from LoanApplicationDTO: the service maps this onto
 * the loan-application graph. Nullable fields tolerate a partial funnel.
 */
@Data
public class IntakeRequest {
    @NotBlank private String sourceLeadId;     // idempotency key (Postgres lead id)
    private String source;                     // e.g. "apply-wizard"
    private String intent;                     // buy | refi | cash
    @NotBlank private String loanPurpose;      // Purchase | Refinance | CashOut
    private BorrowerInfo borrower;
    private PropertyInfo property;
    private Financials financials;
    private LoanOfficerInfo loanOfficer;       // nullable

    @Data public static class BorrowerInfo {
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
    }
    @Data public static class PropertyInfo {
        private String addressLine;
        private String city;
        private String state;
        private String zipCode;
        private String propertyType;      // PrimaryResidence | SecondHome | Investment
        private String constructionType;  // SiteBuilt | Manufactured
        private BigDecimal propertyValue;
    }
    @Data public static class Financials {
        private BigDecimal currentMortgageBalance;
        private BigDecimal annualIncome;
        private String creditBand;
    }
    @Data public static class LoanOfficerInfo {
        private String email;
        private String nmls;
        private String name;
        private String slug;
    }
}
