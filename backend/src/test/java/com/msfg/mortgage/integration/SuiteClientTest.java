package com.msfg.mortgage.integration;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import static org.assertj.core.api.Assertions.assertThat;

class SuiteClientTest {
    MockWebServer server;
    SuiteClient client;

    @BeforeEach void setUp() throws Exception {
        server = new MockWebServer(); server.start();
        WebClient wc = WebClient.builder().baseUrl(server.url("/").toString().replaceAll("/$", "")).build();
        client = new SuiteClient(wc);
    }
    @AfterEach void tearDown() throws Exception { server.shutdown(); }

    @Test void postsIntake_withDevHeaders_returnsLoanId() throws Exception {
        server.enqueue(new MockResponse().setHeader("Content-Type","application/json")
            .setBody("{\"success\":true,\"data\":{\"loanId\":\"11111111-1111-1111-1111-111111111111\",\"loanNumber\":\"LN-1\"}}"));
        SuiteClient.SuiteLoanRef ref = client.createIntake(
            new SuiteClient.IntakePayload("lead-9","Purchase","Ann","Buyer","borrower@dev.local","555","1 Main","Denver","CO","80202",null),
            "00000000-0000-0000-0000-0000000000b0","Borrower","00000000-0000-0000-0000-0000000000aa");
        assertThat(ref.loanId()).isEqualTo("11111111-1111-1111-1111-111111111111");
        RecordedRequest rr = server.takeRequest();
        assertThat(rr.getPath()).isEqualTo("/api/loans/intake");
        assertThat(rr.getHeader("X-Dev-Sub")).isEqualTo("00000000-0000-0000-0000-0000000000b0");
        assertThat(rr.getHeader("X-Dev-Roles")).isEqualTo("Borrower");
        assertThat(rr.getBody().readUtf8()).contains("\"loanPurpose\":\"PURCHASE\"");
    }
}
