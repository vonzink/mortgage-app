package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.service.LoanApplicationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/loan-applications")
public class LoanApplicationController {
    
    @Autowired
    private LoanApplicationService loanApplicationService;
    
    @PostMapping
    public ResponseEntity<LoanApplication> createApplication(@Valid @RequestBody LoanApplicationDTO applicationDTO) {
        LoanApplication application = loanApplicationService.createApplication(applicationDTO);
        return new ResponseEntity<>(application, HttpStatus.CREATED);
    }
    
    @GetMapping
    public ResponseEntity<List<LoanApplication>> getAllApplications() {
        List<LoanApplication> applications = loanApplicationService.getAllApplications();
        return new ResponseEntity<>(applications, HttpStatus.OK);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<LoanApplication> getApplicationById(@PathVariable Long id) {
        Optional<LoanApplication> application = loanApplicationService.getApplicationById(id);
        return application.map(app -> new ResponseEntity<>(app, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }
    
    @GetMapping("/number/{applicationNumber}")
    public ResponseEntity<LoanApplication> getApplicationByNumber(@PathVariable String applicationNumber) {
        Optional<LoanApplication> application = loanApplicationService.getApplicationByNumber(applicationNumber);
        return application.map(app -> new ResponseEntity<>(app, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }
    
    @GetMapping("/status/{status}")
    public ResponseEntity<List<LoanApplication>> getApplicationsByStatus(@PathVariable String status) {
        List<LoanApplication> applications = loanApplicationService.getApplicationsByStatus(status);
        return new ResponseEntity<>(applications, HttpStatus.OK);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<LoanApplication> updateApplication(@PathVariable Long id, @Valid @RequestBody LoanApplicationDTO applicationDTO) {
        try {
            LoanApplication application = loanApplicationService.updateApplication(id, applicationDTO);
            return new ResponseEntity<>(application, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<LoanApplication> updateApplicationStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            LoanApplication application = loanApplicationService.updateApplicationStatus(id, status);
            return new ResponseEntity<>(application, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        try {
            loanApplicationService.deleteApplication(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}
