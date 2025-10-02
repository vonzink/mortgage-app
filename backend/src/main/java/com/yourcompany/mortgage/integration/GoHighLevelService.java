package com.yourcompany.mortgage.integration;

import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.Borrower;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@Service
public class GoHighLevelService {

    @Value("${ghl.api.url}")
    private String apiUrl;

    @Value("${ghl.api.key}")
    private String apiKey;

    private final WebClient webClient;

    public GoHighLevelService() {
        this.webClient = WebClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    public Mono<String> createContact(LoanApplication application) {
        // Get primary borrower (first borrower)
        Borrower primaryBorrower = application.getBorrowers().isEmpty() ? null : application.getBorrowers().get(0);
        
        if (primaryBorrower == null) {
            return Mono.error(new RuntimeException("No borrowers found in application"));
        }
        
        Map<String, Object> contactData = new HashMap<>();
        contactData.put("firstName", primaryBorrower.getFirstName());
        contactData.put("lastName", primaryBorrower.getLastName());
        contactData.put("email", primaryBorrower.getEmail());
        contactData.put("phone", primaryBorrower.getPhone());
        
        // Add custom fields for loan application
        Map<String, Object> customFields = new HashMap<>();
        customFields.put("application_number", application.getApplicationNumber());
        customFields.put("loan_purpose", application.getLoanPurpose());
        customFields.put("loan_type", application.getLoanType());
        customFields.put("loan_amount", application.getLoanAmount().toString());
        customFields.put("property_value", application.getPropertyValue().toString());
        customFields.put("application_status", application.getStatus());
        
        if (application.getProperty() != null) {
            customFields.put("property_address", application.getProperty().getAddressLine());
            customFields.put("property_city", application.getProperty().getCity());
            customFields.put("property_state", application.getProperty().getState());
            customFields.put("property_zip", application.getProperty().getZipCode());
        }
        
        contactData.put("customFields", customFields);

        return webClient.post()
                .uri("/contacts")
                .bodyValue(contactData)
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(response -> 
                    System.out.println("GoHighLevel contact created successfully: " + response))
                .doOnError(error -> 
                    System.err.println("Error creating GoHighLevel contact: " + error.getMessage()));
    }

    public Mono<String> updateContactStatus(String contactId, String status) {
        Map<String, Object> updateData = new HashMap<>();
        Map<String, Object> customFields = new HashMap<>();
        customFields.put("application_status", status);
        updateData.put("customFields", customFields);

        return webClient.put()
                .uri("/contacts/" + contactId)
                .bodyValue(updateData)
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(response -> 
                    System.out.println("GoHighLevel contact updated successfully: " + response))
                .doOnError(error -> 
                    System.err.println("Error updating GoHighLevel contact: " + error.getMessage()));
    }

    public Mono<String> createOpportunity(LoanApplication application) {
        Borrower primaryBorrower = application.getBorrowers().isEmpty() ? null : application.getBorrowers().get(0);
        
        if (primaryBorrower == null) {
            return Mono.error(new RuntimeException("No borrowers found in application"));
        }
        
        Map<String, Object> opportunityData = new HashMap<>();
        opportunityData.put("title", "Loan Application - " + application.getApplicationNumber());
        opportunityData.put("monetaryValue", application.getLoanAmount().doubleValue());
        opportunityData.put("status", mapApplicationStatusToOpportunityStatus(application.getStatus()));
        
        Map<String, Object> contact = new HashMap<>();
        contact.put("email", primaryBorrower.getEmail());
        opportunityData.put("contact", contact);

        return webClient.post()
                .uri("/opportunities")
                .bodyValue(opportunityData)
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(response -> 
                    System.out.println("GoHighLevel opportunity created successfully: " + response))
                .doOnError(error -> 
                    System.err.println("Error creating GoHighLevel opportunity: " + error.getMessage()));
    }

    private String mapApplicationStatusToOpportunityStatus(String applicationStatus) {
        switch (applicationStatus.toUpperCase()) {
            case "APPROVED":
                return "Won";
            case "DENIED":
                return "Lost";
            case "SUBMITTED":
            case "PROCESSING":
                return "Open";
            default:
                return "Open";
        }
    }
}
