package com.msfg.mortgage.integration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/** Server-to-server client to msfg-suite. Creates the loan in suite (the system of record). */
@Service
public class SuiteClient {

    private final WebClient suite;

    public SuiteClient(@Qualifier("suiteWebClient") WebClient suite) {
        this.suite = suite;
    }

    public record IntakePayload(String sourceLeadId, String loanPurpose, String firstName, String lastName,
                                String email, String phone, String addressLine1, String city, String state,
                                String postalCode, BigDecimal estimatedValue) {}

    public record SuiteLoanRef(String loanId, String loanNumber) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Envelope(boolean success, SuiteLoanRef data) {}

    /** mortgage-app loanPurpose ("Purchase|Refinance|CashOut") -> suite LoanPurposeType name. */
    private static String mapPurpose(String p) {
        if (p == null) return "OTHER";
        return switch (p) {
            case "Purchase" -> "PURCHASE";
            case "Refinance", "CashOut" -> "REFINANCE";   // suite has no CASH_OUT constant today
            default -> "OTHER";
        };
    }

    public SuiteLoanRef createIntake(IntakePayload in, String devSub, String devRoles, String devOrg) {
        Map<String, Object> borrower = new LinkedHashMap<>();
        borrower.put("firstName", in.firstName());
        borrower.put("lastName", in.lastName());
        borrower.put("email", in.email());
        borrower.put("phone", in.phone());

        Map<String, Object> property = new LinkedHashMap<>();
        property.put("addressLine1", in.addressLine1());
        property.put("city", in.city());
        property.put("state", in.state());
        property.put("postalCode", in.postalCode());
        property.put("estimatedValue", in.estimatedValue());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sourceLeadId", in.sourceLeadId());
        body.put("loanPurpose", mapPurpose(in.loanPurpose()));
        body.put("borrower", borrower);
        body.put("property", property);

        WebClient.RequestBodySpec req = suite.post().uri("/api/loans/intake");
        if (devSub != null)   req = req.header("X-Dev-Sub", devSub);
        if (devRoles != null) req = req.header("X-Dev-Roles", devRoles);
        if (devOrg != null)   req = req.header("X-Dev-Org", devOrg);

        Envelope env = req.bodyValue(body)
                .retrieve()
                .bodyToMono(Envelope.class)
                .block(Duration.ofSeconds(8));
        return env == null ? null : env.data();
    }
}
