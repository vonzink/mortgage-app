package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.*;
import com.yourcompany.mortgage.exception.ResourceNotFoundException;
import com.yourcompany.mortgage.mapper.LoanApplicationMapper;
import com.yourcompany.mortgage.model.*;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import com.yourcompany.mortgage.repository.LoanStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
public class LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final LoanStatusHistoryRepository loanStatusHistoryRepository;
    private final LoanApplicationMapper mapper;

    /**
     * Create a loan application + its full child tree (property, borrowers and their
     * employment/income/residence/declaration, top-level liabilities). Persistence is
     * cascade-driven: every relationship from {@link LoanApplication} and {@link Borrower}
     * is mapped {@code cascade = ALL, orphanRemoval = true}, so a single
     * {@code save(app)} writes the entire graph.
     */
    public LoanApplication createApplication(LoanApplicationDTO dto) {
        LoanApplication app = mapper.toEntity(dto);

        if (dto.getProperty() != null) {
            Property p = mapper.toEntity(dto.getProperty());
            p.setApplication(app);
            app.setProperty(p);
        }

        if (dto.getBorrowers() != null && !dto.getBorrowers().isEmpty()) {
            List<Borrower> borrowers = new ArrayList<>(dto.getBorrowers().size());
            for (BorrowerDTO bDto : dto.getBorrowers()) {
                borrowers.add(buildBorrower(bDto, app));
            }
            app.setBorrowers(borrowers);
        }

        if (dto.getLiabilities() != null && !dto.getLiabilities().isEmpty()) {
            List<Liability> liabs = new ArrayList<>(dto.getLiabilities().size());
            for (LiabilityDTO lDto : dto.getLiabilities()) {
                Liability l = mapper.toEntity(lDto);
                l.setApplication(app);
                liabs.add(l);
            }
            app.setLiabilities(liabs);
        }

        return loanApplicationRepository.save(app);
    }

    private Borrower buildBorrower(BorrowerDTO dto, LoanApplication app) {
        Borrower b = mapper.toEntity(dto);
        b.setApplication(app);

        if (dto.getEmploymentHistory() != null) {
            List<Employment> list = new ArrayList<>(dto.getEmploymentHistory().size());
            for (EmploymentDTO eDto : dto.getEmploymentHistory()) {
                Employment e = mapper.toEntity(eDto);
                e.setBorrower(b);
                list.add(e);
            }
            b.setEmploymentHistory(list);
        }

        if (dto.getIncomeSources() != null) {
            List<IncomeSource> list = new ArrayList<>(dto.getIncomeSources().size());
            for (IncomeSourceDTO iDto : dto.getIncomeSources()) {
                IncomeSource i = mapper.toEntity(iDto);
                i.setBorrower(b);
                list.add(i);
            }
            b.setIncomeSources(list);
        }

        if (dto.getResidences() != null) {
            List<Residence> list = new ArrayList<>(dto.getResidences().size());
            for (ResidenceDTO rDto : dto.getResidences()) {
                Residence r = mapper.toEntity(rDto);
                r.setBorrower(b);
                list.add(r);
            }
            b.setResidences(list);
        }

        if (dto.getDeclaration() != null) {
            Declaration d = mapper.toEntity(dto.getDeclaration());
            d.setBorrower(b);
            b.setDeclaration(d);
        }

        return b;
    }

    @Transactional(readOnly = true)
    public List<LoanApplication> getAllApplications() {
        return loanApplicationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<LoanApplication> getApplicationById(Long id) {
        return loanApplicationRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<LoanApplication> getApplicationByNumber(String applicationNumber) {
        return loanApplicationRepository.findByApplicationNumber(applicationNumber);
    }

    @Transactional(readOnly = true)
    public List<LoanApplication> getApplicationsByStatus(String status) {
        return loanApplicationRepository.findByStatus(status);
    }

    public LoanApplication updateApplication(Long id, LoanApplicationDTO applicationDTO) {
        LoanApplication application = loanApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        application.setLoanPurpose(applicationDTO.getLoanPurpose());
        application.setLoanType(applicationDTO.getLoanType());
        application.setLoanAmount(applicationDTO.getLoanAmount());
        application.setPropertyValue(applicationDTO.getPropertyValue());
        application.setStatus(applicationDTO.getStatus());

        return loanApplicationRepository.save(application);
    }

    public void deleteApplication(Long id) {
        loanApplicationRepository.deleteById(id);
    }

    /**
     * Move a loan to a new status. Validates the requested value against {@link LoanStatus}
     * (legacy DRAFT/SUBMITTED/PROCESSING values are accepted and remapped); writes a row to
     * {@code loan_status_history} for auditing; updates {@code loan_applications.status}.
     *
     * <p>The {@code transitionedByUserId} is left null for now — Phase 3 (LO UI) will resolve the
     * caller from the JWT and stamp it. The note column is reserved for an LO-entered comment.
     */
    public LoanApplication updateApplicationStatus(Long id, String status) {
        LoanApplication application = loanApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        LoanStatus parsed = LoanStatus.fromString(status)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown loan status: '" + status + "'. Valid: " +
                                java.util.Arrays.toString(LoanStatus.values())));

        if (parsed == application.getLoanStatus()) {
            return application;
        }

        application.setLoanStatus(parsed);
        LoanApplication saved = loanApplicationRepository.save(application);

        loanStatusHistoryRepository.save(LoanStatusHistory.builder()
                .loanApplicationId(saved.getId())
                .status(parsed.name())
                .build());

        return saved;
    }
}
