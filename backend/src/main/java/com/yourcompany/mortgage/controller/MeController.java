package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.User;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import com.yourcompany.mortgage.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * "Me" endpoints — caller-scoped reads. Backs the borrower portal's loans dashboard
 * and the LO/agent portals.
 */
@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
@Slf4j
public class MeController {

    private final CurrentUserService currentUserService;
    private final LoanApplicationRepository loanApplicationRepository;

    /** Current user info (resolved from the Cognito JWT, materialized on first call). */
    @GetMapping
    public ResponseEntity<?> me() {
        Optional<User> me = currentUserService.currentUser();
        if (me.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(toView(me.get()));
    }

    /**
     * Loans the calling user can see, role-filtered:
     *   - Borrower → loans where one of the borrowers row's user_id matches them
     *   - RealEstateAgent → loans where loan_agents.user_id matches them
     *   - LO/Processor → loans where assigned_lo_id matches them
     *   - Admin/Manager → all loans
     */
    @GetMapping("/loans")
    public ResponseEntity<?> myLoans() {
        Optional<User> meOpt = currentUserService.currentUser();
        if (meOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User me = meOpt.get();
        List<LoanApplication> loans;

        switch (me.getRole().toLowerCase()) {
            case "admin", "manager" ->
                    loans = loanApplicationRepository.findAll();   // all
            case "lo", "processor" ->
                    loans = loanApplicationRepository.findByAssignedLoIdOrderByCreatedDateDesc(me.getId());
            case "realestateagent", "agent" ->
                    loans = loanApplicationRepository.findByAgentUserId(me.getId());
            case "borrower" ->
                    loans = loanApplicationRepository.findByBorrowerUserId(me.getId());
            default -> {
                log.warn("Unknown role '{}' on user {} — returning empty list", me.getRole(), me.getId());
                loans = List.of();
            }
        }

        // Slim DTO so we don't ship the full nested borrower/property graph on a list view
        List<Map<String, Object>> items = new ArrayList<>(loans.size());
        for (LoanApplication la : loans) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", la.getId());
            row.put("applicationNumber", la.getApplicationNumber());
            row.put("loanPurpose", la.getLoanPurpose());
            row.put("loanType", la.getLoanType());
            row.put("loanAmount", la.getLoanAmount());
            row.put("propertyValue", la.getPropertyValue());
            row.put("status", la.getStatus());
            row.put("assignedLoName", la.getAssignedLoName());
            row.put("createdDate", la.getCreatedDate());
            row.put("updatedDate", la.getUpdatedDate());
            items.add(row);
        }

        return ResponseEntity.ok(Map.of("count", items.size(), "loans", items));
    }

    private static Map<String, Object> toView(User u) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", u.getId());
        v.put("email", u.getEmail());
        v.put("name", u.getName());
        v.put("initials", u.getInitials());
        v.put("role", u.getRole());
        v.put("cognitoGroup", u.getCognitoGroup());
        return v;
    }
}
