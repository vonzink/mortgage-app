package com.yourcompany.mortgage.controller;

import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import com.yourcompany.mortgage.mismo.MismoExporter;
import com.yourcompany.mortgage.mismo.MismoImporter;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.LoanStatusHistory;
import com.yourcompany.mortgage.model.MismoImport;
import com.yourcompany.mortgage.model.User;
import com.yourcompany.mortgage.repository.LoanStatusHistoryRepository;
import com.yourcompany.mortgage.repository.MismoImportRepository;
import com.yourcompany.mortgage.security.CurrentUserService;
import com.yourcompany.mortgage.service.LoanApplicationService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Loan application REST endpoints.
 *
 * <p>Path-level auth happens in {@code SecurityConfig}. Per-loan ownership checks
 * (e.g. "this borrower can only see their own loan") are added later via {@code LoanAccessGuard}.
 *
 * <p>v2 of this controller introduced status-history tracking — the status enum now uses
 * {@link com.yourcompany.mortgage.model.LoanStatus} (REGISTERED → FUNDED), not the old
 * DRAFT/SUBMITTED/PROCESSING values.
 */
@RestController
@RequestMapping("/loan-applications")
@RequiredArgsConstructor
@Slf4j
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;
    private final LoanStatusHistoryRepository loanStatusHistoryRepository;
    private final MismoExporter mismoExporter;
    private final MismoImporter mismoImporter;
    private final MismoImportRepository mismoImportRepository;
    private final CurrentUserService currentUserService;

    @PostMapping
    public ResponseEntity<LoanApplication> createApplication(@Valid @RequestBody LoanApplicationDTO applicationDTO) {
        log.info("Creating loan application");
        LoanApplication application = loanApplicationService.createApplication(applicationDTO);
        return new ResponseEntity<>(application, HttpStatus.CREATED);
    }

    /**
     * Create a fresh loan application by importing a MISMO XML file. Common workflow:
     * LO has a MISMO from a prior LOS or referral and starts a new loan from it instead of
     * retyping. The empty application is created first (to get an ID), then the importer
     * applies the MISMO data on top.
     *
     * <p>If the calling user is in {@code LO}/{@code Processor}/{@code Admin}/{@code Manager},
     * they're auto-assigned as the loan officer.
     */
    @PostMapping(value = "/from-mismo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('LO', 'Processor', 'Admin', 'Manager', 'Borrower')")
    public ResponseEntity<?> createFromMismo(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "file_required"));
        }
        try {
            // Bare-minimum DTO so the create-side validation doesn't reject it; the importer
            // will overwrite anything we set here.
            LoanApplicationDTO seed = new LoanApplicationDTO();
            seed.setLoanPurpose("Purchase");
            seed.setLoanType("Conventional");
            seed.setStatus("REGISTERED");

            LoanApplication la = loanApplicationService.createApplication(seed);

            // Auto-assign to the calling LO when applicable
            User me = currentUserService.currentUser().orElse(null);
            if (me != null) {
                String role = me.getRole() == null ? "" : me.getRole().toLowerCase();
                if (role.equals("lo") || role.equals("processor") || role.equals("admin") || role.equals("manager")) {
                    la.setAssignedLoId(me.getId());
                    la.setAssignedLoName(me.getName());
                }
            }

            try (var stream = new java.io.ByteArrayInputStream(file.getBytes())) {
                MismoImporter.ImportResult result = mismoImporter.importInto(la, stream);

                mismoImportRepository.save(MismoImport.builder()
                        .loanApplicationId(la.getId())
                        .importedByUserId(me == null ? null : me.getId())
                        .sourceFilename(file.getOriginalFilename())
                        .fileCreatedDatetime(result.fileCreatedDatetime())
                        .fieldsChangedCount(result.changeCount())
                        .fieldsChangedSummary(result.fieldsChangedSummaryJson())
                        .forced(false)
                        .build());

                Map<String, Object> body = new LinkedHashMap<>();
                body.put("ok", true);
                body.put("id", la.getId());
                body.put("applicationNumber", la.getApplicationNumber());
                body.put("changeCount", result.changeCount());
                body.put("assignedLoId", la.getAssignedLoId());
                return ResponseEntity.status(HttpStatus.CREATED).body(body);
            }
        } catch (Exception e) {
            log.warn("Create-from-MISMO failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "import_failed", "message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<LoanApplication>> getAllApplications() {
        List<LoanApplication> applications = loanApplicationService.getAllApplications();
        return new ResponseEntity<>(applications, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@loanAccessGuard.canAccess(#id)")
    public ResponseEntity<LoanApplication> getApplicationById(@PathVariable Long id) {
        Optional<LoanApplication> application = loanApplicationService.getApplicationById(id);
        return application.map(app -> new ResponseEntity<>(app, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /** Status timeline for a loan — used by the borrower portal's progress view. */
    @GetMapping("/{id}/status-history")
    @PreAuthorize("@loanAccessGuard.canAccess(#id)")
    public ResponseEntity<List<LoanStatusHistory>> getStatusHistory(@PathVariable Long id) {
        return ResponseEntity.ok(
                loanStatusHistoryRepository.findByLoanApplicationIdOrderByTransitionedAtAsc(id)
        );
    }

    /**
     * Import a MISMO 3.4 XML file. Always-overwrite for fields we model.
     *
     * <p>Drift protection: if the file's {@code <CreatedDatetime>} is older than the
     * application's {@code updatedDate}, we return 409 Conflict with details about the drift
     * (number of recent edits) so the UI can prompt the LO. Re-submit with {@code ?force=true}
     * to apply anyway.
     *
     * <p>Tags + S3 checkpointing happen in Chunk D — for v1 this just merges the file into
     * the DB and writes an audit row.
     */
    @PostMapping(value = "/{id}/import/mismo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@loanAccessGuard.canAccess(#id)")
    public ResponseEntity<?> importMismo(@PathVariable Long id,
                                         @RequestParam("file") MultipartFile file,
                                         @RequestParam(value = "force", required = false, defaultValue = "false") boolean force) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "file_required"));
        }
        var laOpt = loanApplicationService.getApplicationById(id);
        if (laOpt.isEmpty()) return ResponseEntity.notFound().build();
        LoanApplication la = laOpt.get();

        try {
            byte[] bytes = file.getBytes();

            // Drift check: peek the file's CreatedDatetime, compare to la.updatedDate
            LocalDateTime fileCreated;
            try (var headerStream = new java.io.ByteArrayInputStream(bytes)) {
                fileCreated = mismoImporter.peekCreatedDatetime(headerStream);
            }
            if (!force && fileCreated != null && la.getUpdatedDate() != null
                    && la.getUpdatedDate().isAfter(fileCreated)) {
                Map<String, Object> drift = new LinkedHashMap<>();
                drift.put("error", "drift_detected");
                drift.put("fileCreatedDatetime", fileCreated);
                drift.put("applicationUpdatedDate", la.getUpdatedDate());
                drift.put("ageDifferenceSeconds",
                        Duration.between(fileCreated, la.getUpdatedDate()).toSeconds());
                drift.put("message", "The application has been modified since this MISMO file was generated. Re-submit with force=true to overwrite.");
                return ResponseEntity.status(409).body(drift);
            }

            MismoImporter.ImportResult result;
            try (var importStream = new java.io.ByteArrayInputStream(bytes)) {
                result = mismoImporter.importInto(la, importStream);
            }

            // Audit row (Chunk D will fill in s3CheckpointKey when checkpoints land)
            Integer userId = currentUserService.currentUser().map(User::getId).orElse(null);
            mismoImportRepository.save(MismoImport.builder()
                    .loanApplicationId(la.getId())
                    .importedByUserId(userId)
                    .sourceFilename(file.getOriginalFilename())
                    .fileCreatedDatetime(result.fileCreatedDatetime())
                    .fieldsChangedCount(result.changeCount())
                    .fieldsChangedSummary(result.fieldsChangedSummaryJson())
                    .forced(force)
                    .build());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("ok", true);
            body.put("changeCount", result.changeCount());
            body.put("changes", result.changes());
            body.put("fileCreatedDatetime", result.fileCreatedDatetime());
            body.put("forced", force);
            return ResponseEntity.ok(body);

        } catch (java.io.IOException e) {
            log.warn("MISMO import failed for loan {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "parse_failed", "message", e.getMessage()));
        }
    }

    /**
     * Export the loan as a MISMO 3.4 XML file. v1 emits application-stage data only — see
     * {@link MismoExporter} for the section list. Returns {@code application/xml} with a
     * filename like {@code MSFG-APP123456-2026-04-30.xml}.
     */
    @GetMapping("/{id}/export/mismo")
    @PreAuthorize("@loanAccessGuard.canAccess(#id)")
    public ResponseEntity<?> exportMismo(@PathVariable Long id) {
        return loanApplicationService.getApplicationById(id)
                .<ResponseEntity<?>>map(la -> {
                    byte[] xml = mismoExporter.exportToBytes(la);
                    String filename = String.format("MSFG-%s-%s.xml",
                            la.getApplicationNumber() == null ? id : la.getApplicationNumber(),
                            java.time.LocalDate.now());
                    return ResponseEntity.ok()
                            .contentType(MediaType.APPLICATION_XML)
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    "attachment; filename=\"" + filename + "\"")
                            .body(new ByteArrayResource(xml));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
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
            log.warn("Update failed for application {}: {}", id, e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateApplicationStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            LoanApplication application = loanApplicationService.updateApplicationStatus(id, status);
            return new ResponseEntity<>(application, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Status update rejected for application {} -> {}: {}", id, status, e.getMessage());
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.warn("Status update failed for application {} -> {}: {}", id, status, e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@loanAccessGuard.canAccess(#id)")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        try {
            loanApplicationService.deleteApplication(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            log.warn("Delete failed for application {}: {}", id, e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}
