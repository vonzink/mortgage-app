package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.dto.ApiResponse;
import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.service.LoanApplicationServiceRefactored;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Refactored LoanApplicationController with improved error handling and response structure
 */
@RestController
@RequestMapping("/api/v1/loan-applications")
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:3000}")
@RequiredArgsConstructor
@Slf4j
public class LoanApplicationControllerRefactored {
    
    private final LoanApplicationServiceRefactored loanApplicationService;
    
    /**
     * Create a new loan application
     */
    @PostMapping
    public ResponseEntity<ApiResponse<LoanApplication>> createApplication(
            @Valid @RequestBody LoanApplicationDTO applicationDTO) {
        
        log.info("Creating new loan application");
        
        try {
            LoanApplication application = loanApplicationService.createFromDTO(applicationDTO);
            ApiResponse<LoanApplication> response = ApiResponse.success(
                    application, 
                    "Loan application created successfully"
            );
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            log.error("Error creating loan application: ", e);
            ApiResponse<LoanApplication> response = ApiResponse.error(
                    "Failed to create loan application: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    /**
     * Get all loan applications
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<LoanApplication>>> getAllApplications(
            @RequestParam(required = false) String status,
            Pageable pageable) {
        
        log.info("Retrieving loan applications with status: {}", status);
        
        try {
            List<LoanApplication> applications;
            
            if (status != null && !status.trim().isEmpty()) {
                applications = loanApplicationService.findByStatus(status);
            } else {
                applications = loanApplicationService.findAll();
            }
            
            ApiResponse<List<LoanApplication>> response = ApiResponse.success(
                    applications,
                    "Loan applications retrieved successfully"
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error retrieving loan applications: ", e);
            ApiResponse<List<LoanApplication>> response = ApiResponse.error(
                    "Failed to retrieve loan applications: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get loan applications with pagination
     */
    @GetMapping("/paginated")
    public ResponseEntity<ApiResponse<Page<LoanApplication>>> getAllApplicationsPaginated(
            Pageable pageable) {
        
        log.info("Retrieving paginated loan applications");
        
        try {
            Page<LoanApplication> applications = loanApplicationService.findAll(pageable);
            ApiResponse<Page<LoanApplication>> response = ApiResponse.success(
                    applications,
                    "Paginated loan applications retrieved successfully"
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error retrieving paginated loan applications: ", e);
            ApiResponse<Page<LoanApplication>> response = ApiResponse.error(
                    "Failed to retrieve paginated loan applications: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get loan application by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LoanApplication>> getApplicationById(@PathVariable Long id) {
        
        log.info("Retrieving loan application with ID: {}", id);
        
        try {
            Optional<LoanApplication> application = loanApplicationService.findById(id);
            
            if (application.isPresent()) {
                ApiResponse<LoanApplication> response = ApiResponse.success(
                        application.get(),
                        "Loan application retrieved successfully"
                );
                return ResponseEntity.ok(response);
            } else {
                ApiResponse<LoanApplication> response = ApiResponse.error(
                        "Loan application not found with ID: " + id
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            log.error("Error retrieving loan application with ID {}: ", id, e);
            ApiResponse<LoanApplication> response = ApiResponse.error(
                    "Failed to retrieve loan application: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get loan application by application number
     */
    @GetMapping("/number/{applicationNumber}")
    public ResponseEntity<ApiResponse<LoanApplication>> getApplicationByNumber(
            @PathVariable String applicationNumber) {
        
        log.info("Retrieving loan application with number: {}", applicationNumber);
        
        try {
            Optional<LoanApplication> application = loanApplicationService.findByApplicationNumber(applicationNumber);
            
            if (application.isPresent()) {
                ApiResponse<LoanApplication> response = ApiResponse.success(
                        application.get(),
                        "Loan application retrieved successfully"
                );
                return ResponseEntity.ok(response);
            } else {
                ApiResponse<LoanApplication> response = ApiResponse.error(
                        "Loan application not found with number: " + applicationNumber
                );
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
        } catch (Exception e) {
            log.error("Error retrieving loan application with number {}: ", applicationNumber, e);
            ApiResponse<LoanApplication> response = ApiResponse.error(
                    "Failed to retrieve loan application: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Get loan applications by status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<LoanApplication>>> getApplicationsByStatus(
            @PathVariable String status) {
        
        log.info("Retrieving loan applications with status: {}", status);
        
        try {
            List<LoanApplication> applications = loanApplicationService.findByStatus(status);
            ApiResponse<List<LoanApplication>> response = ApiResponse.success(
                    applications,
                    "Loan applications retrieved successfully"
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error retrieving loan applications with status {}: ", status, e);
            ApiResponse<List<LoanApplication>> response = ApiResponse.error(
                    "Failed to retrieve loan applications: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Update loan application
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LoanApplication>> updateApplication(
            @PathVariable Long id,
            @Valid @RequestBody LoanApplicationDTO applicationDTO) {
        
        log.info("Updating loan application with ID: {}", id);
        
        try {
            LoanApplication application = loanApplicationService.updateFromDTO(id, applicationDTO);
            ApiResponse<LoanApplication> response = ApiResponse.success(
                    application,
                    "Loan application updated successfully"
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error updating loan application with ID {}: ", id, e);
            ApiResponse<LoanApplication> response = ApiResponse.error(
                    "Failed to update loan application: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    /**
     * Update loan application status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<LoanApplication>> updateApplicationStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        
        log.info("Updating loan application status for ID: {} to status: {}", id, status);
        
        try {
            LoanApplication application = loanApplicationService.updateStatus(id, status);
            ApiResponse<LoanApplication> response = ApiResponse.success(
                    application,
                    "Loan application status updated successfully"
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error updating loan application status for ID {}: ", id, e);
            ApiResponse<LoanApplication> response = ApiResponse.error(
                    "Failed to update loan application status: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    /**
     * Delete loan application
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteApplication(@PathVariable Long id) {
        
        log.info("Deleting loan application with ID: {}", id);
        
        try {
            loanApplicationService.deleteById(id);
            ApiResponse<Void> response = ApiResponse.success(
                    "Loan application deleted successfully"
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error deleting loan application with ID {}: ", id, e);
            ApiResponse<Void> response = ApiResponse.error(
                    "Failed to delete loan application: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    /**
     * Get application statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<ApplicationStatistics>> getApplicationStatistics() {
        
        log.info("Retrieving application statistics");
        
        try {
            long totalApplications = loanApplicationService.count();
            List<LoanApplication> draftApplications = loanApplicationService.findByStatus("DRAFT");
            List<LoanApplication> submittedApplications = loanApplicationService.findByStatus("SUBMITTED");
            
            ApplicationStatistics stats = ApplicationStatistics.builder()
                    .totalApplications(totalApplications)
                    .draftApplications(draftApplications.size())
                    .submittedApplications(submittedApplications.size())
                    .build();
            
            ApiResponse<ApplicationStatistics> response = ApiResponse.success(
                    stats,
                    "Application statistics retrieved successfully"
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error retrieving application statistics: ", e);
            ApiResponse<ApplicationStatistics> response = ApiResponse.error(
                    "Failed to retrieve application statistics: " + e.getMessage()
            );
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Statistics DTO for application metrics
     */
    @lombok.Data
    @lombok.Builder
    public static class ApplicationStatistics {
        private long totalApplications;
        private int draftApplications;
        private int submittedApplications;
    }
}
