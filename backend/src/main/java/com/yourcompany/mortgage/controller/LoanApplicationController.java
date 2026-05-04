package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.dto.AIReviewResult;
import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.mismo.MismoExporter;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.service.LoanApplicationService;
import com.yourcompany.mortgage.integration.AiReviewService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/loan-applications")
public class LoanApplicationController {
    
    @Autowired
    private LoanApplicationService loanApplicationService;

    @Autowired
    private AiReviewService aiReviewService;

    @Autowired
    private MismoExporter mismoExporter;

    /**
     * MISMO 3.4 XML export. {@code variant} is "closing" (default) or "fnm" (Fannie Mae shape).
     * Gated by LoanAccessGuard: only assigned LO/internal staff or a borrower-on-loan can export.
     */
    @GetMapping("/{id}/export/mismo")
    @PreAuthorize("@loanAccessGuard.canAccess(#id)")
    public ResponseEntity<byte[]> exportMismo(@PathVariable Long id,
                                              @RequestParam(value = "variant", defaultValue = "closing") String variant) throws IOException {
        Optional<LoanApplication> applicationOpt = loanApplicationService.getApplicationById(id);
        if (applicationOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        LoanApplication application = applicationOpt.get();
        byte[] xml = mismoExporter.export(application, variant);
        String filename = mismoExporter.suggestedFilename(application, variant);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(xml);
    }
    
    @PostMapping
    public ResponseEntity<LoanApplication> createApplication(@Valid @RequestBody LoanApplicationDTO applicationDTO) {
        LoanApplication application = loanApplicationService.createApplication(applicationDTO);
        return new ResponseEntity<>(application, HttpStatus.CREATED);
    }
    
    @PostMapping("/{id}/ai-review")
    public ResponseEntity<AIReviewResult> reviewApplicationWithAI(@PathVariable Long id) {
        Optional<LoanApplication> applicationOpt = loanApplicationService.getApplicationById(id);
        if (applicationOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        AIReviewResult result = aiReviewService.evaluateApplication(applicationOpt.get());
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    // Preview AI review without saving an application
    @PostMapping("/ai-review-preview")
    public ResponseEntity<AIReviewResult> previewApplicationWithAI(@Valid @RequestBody LoanApplicationDTO applicationDTO) {
        AIReviewResult result = aiReviewService.evaluateApplicationDTO(applicationDTO);
        return new ResponseEntity<>(result, HttpStatus.OK);
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
