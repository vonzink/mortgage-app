package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.*;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.mapper.LoanApplicationMapper;
import com.msfg.mortgage.model.*;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import com.msfg.mortgage.repository.LoanStatusHistoryRepository;
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

    /**
     * Server-side clone of an existing application — produces a fresh row that
     * carries forward the full data tree (property, every borrower with
     * employment/income/residences/declaration/assets/REO, and top-level
     * liabilities) so the LO doesn't retype.
     *
     * <p>What we DO NOT copy: identifiers that must stay unique per loan
     * (applicationNumber + lendingpadLoanNumber + investorLoanNumber + MERS
     * MIN), audit / status timestamps (status resets to REGISTERED), borrower
     * SSNs (re-collect to avoid stale-PII risk), and document records (the
     * carried document workspace would point at someone else's S3 keys).
     */
    public LoanApplication cloneApplication(Long sourceId) {
        LoanApplication src = loanApplicationRepository.findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanApplication " + sourceId + " not found"));

        LoanApplication app = new LoanApplication();
        app.setLoanPurpose(src.getLoanPurpose());
        app.setLoanType(src.getLoanType());
        app.setLoanAmount(src.getLoanAmount());
        app.setPropertyValue(src.getPropertyValue());
        app.setStatus("REGISTERED");
        app.setAssignedLoId(src.getAssignedLoId());
        app.setAssignedLoName(src.getAssignedLoName());
        // Identifiers stay null — uniqueness constraints + the
        // applicationNumber generator will assign fresh values on save.

        if (src.getProperty() != null) {
            Property srcP = src.getProperty();
            Property p = new Property();
            p.setApplication(app);
            p.setAddressLine(srcP.getAddressLine());
            p.setCity(srcP.getCity());
            p.setState(srcP.getState());
            p.setZipCode(srcP.getZipCode());
            p.setCounty(srcP.getCounty());
            p.setPropertyType(srcP.getPropertyType());
            p.setPropertyValue(srcP.getPropertyValue());
            p.setPurchasePrice(srcP.getPurchasePrice());
            p.setConstructionType(srcP.getConstructionType());
            p.setYearBuilt(srcP.getYearBuilt());
            p.setUnitsCount(srcP.getUnitsCount());
            p.setAttachmentType(srcP.getAttachmentType());
            p.setProjectType(srcP.getProjectType());
            app.setProperty(p);
        }

        if (src.getBorrowers() != null && !src.getBorrowers().isEmpty()) {
            List<Borrower> borrowers = new ArrayList<>(src.getBorrowers().size());
            for (Borrower srcB : src.getBorrowers()) {
                borrowers.add(cloneBorrower(srcB, app));
            }
            app.setBorrowers(borrowers);
        }

        if (src.getLiabilities() != null && !src.getLiabilities().isEmpty()) {
            List<Liability> liabs = new ArrayList<>(src.getLiabilities().size());
            for (Liability srcL : src.getLiabilities()) {
                Liability l = new Liability();
                l.setApplication(app);
                l.setAccountNumber(srcL.getAccountNumber());
                l.setCreditorName(srcL.getCreditorName());
                l.setLiabilityType(srcL.getLiabilityType());
                l.setMonthlyPayment(srcL.getMonthlyPayment());
                l.setUnpaidBalance(srcL.getUnpaidBalance());
                l.setPayoffStatus(Boolean.TRUE.equals(srcL.getPayoffStatus()));
                l.setToBePaidOff(Boolean.TRUE.equals(srcL.getToBePaidOff()));
                l.setExclusionReason(srcL.getExclusionReason());
                // borrower FK left null — re-link after borrower clones get IDs
                liabs.add(l);
            }
            app.setLiabilities(liabs);
        }

        return loanApplicationRepository.save(app);
    }

    private Borrower cloneBorrower(Borrower src, LoanApplication app) {
        Borrower b = new Borrower();
        b.setApplication(app);
        b.setSequenceNumber(src.getSequenceNumber());
        b.setFirstName(src.getFirstName());
        b.setLastName(src.getLastName());
        // SSN intentionally NOT copied — re-collect to avoid stale-PII risk.
        b.setBirthDate(src.getBirthDate());
        b.setMaritalStatus(src.getMaritalStatus());
        b.setEmail(src.getEmail());
        b.setPhone(src.getPhone());
        b.setCitizenshipType(src.getCitizenshipType());
        b.setDependentsCount(src.getDependentsCount());
        b.setCurrentAddressLine(src.getCurrentAddressLine());
        b.setCurrentCity(src.getCurrentCity());
        b.setCurrentState(src.getCurrentState());
        b.setCurrentZipCode(src.getCurrentZipCode());

        if (src.getEmploymentHistory() != null) {
            List<Employment> list = new ArrayList<>();
            for (Employment srcE : src.getEmploymentHistory()) {
                Employment e = new Employment();
                e.setBorrower(b);
                e.setSequenceNumber(srcE.getSequenceNumber());
                e.setEmployerName(srcE.getEmployerName());
                e.setEmployerPhone(srcE.getEmployerPhone());
                e.setEmployerAddress(srcE.getEmployerAddress());
                e.setEmployerCity(srcE.getEmployerCity());
                e.setEmployerState(srcE.getEmployerState());
                e.setEmployerZip(srcE.getEmployerZip());
                e.setPosition(srcE.getPosition());
                e.setStartDate(srcE.getStartDate());
                e.setEndDate(srcE.getEndDate());
                e.setMonthlyIncome(srcE.getMonthlyIncome());
                e.setEmploymentStatus(srcE.getEmploymentStatus());
                e.setIsPresent(srcE.getIsPresent());
                e.setSelfEmployed(srcE.getSelfEmployed());
                list.add(e);
            }
            b.setEmploymentHistory(list);
        }

        if (src.getIncomeSources() != null) {
            List<IncomeSource> list = new ArrayList<>();
            for (IncomeSource srcI : src.getIncomeSources()) {
                IncomeSource i = new IncomeSource();
                i.setBorrower(b);
                i.setIncomeType(srcI.getIncomeType());
                i.setMonthlyAmount(srcI.getMonthlyAmount());
                i.setDescription(srcI.getDescription());
                list.add(i);
            }
            b.setIncomeSources(list);
        }

        if (src.getResidences() != null) {
            List<Residence> list = new ArrayList<>();
            for (Residence srcR : src.getResidences()) {
                Residence r = new Residence();
                r.setBorrower(b);
                r.setAddressLine(srcR.getAddressLine());
                r.setCity(srcR.getCity());
                r.setState(srcR.getState());
                r.setZipCode(srcR.getZipCode());
                r.setResidencyType(srcR.getResidencyType());
                r.setResidencyBasis(srcR.getResidencyBasis());
                r.setDurationMonths(srcR.getDurationMonths());
                r.setMonthlyRent(srcR.getMonthlyRent());
                list.add(r);
            }
            b.setResidences(list);
        }

        if (src.getAssets() != null) {
            List<Asset> list = new ArrayList<>();
            for (Asset srcA : src.getAssets()) {
                Asset a = new Asset();
                a.setBorrower(b);
                a.setAssetType(srcA.getAssetType());
                a.setBankName(srcA.getBankName());
                a.setAccountNumber(srcA.getAccountNumber());
                a.setAssetValue(srcA.getAssetValue());
                a.setUsedForDownpayment(srcA.getUsedForDownpayment());
                list.add(a);
            }
            b.setAssets(list);
        }

        if (src.getReoProperties() != null) {
            List<REOProperty> list = new ArrayList<>();
            for (REOProperty srcR : src.getReoProperties()) {
                REOProperty r = new REOProperty();
                r.setBorrower(b);
                r.setSequenceNumber(srcR.getSequenceNumber());
                r.setAddressLine(srcR.getAddressLine());
                r.setCity(srcR.getCity());
                r.setState(srcR.getState());
                r.setZipCode(srcR.getZipCode());
                r.setPropertyType(srcR.getPropertyType());
                r.setPropertyValue(srcR.getPropertyValue());
                r.setMonthlyRentalIncome(srcR.getMonthlyRentalIncome());
                r.setMonthlyPayment(srcR.getMonthlyPayment());
                r.setUnpaidBalance(srcR.getUnpaidBalance());
                list.add(r);
            }
            b.setReoProperties(list);
        }

        if (src.getDeclaration() != null) {
            Declaration srcD = src.getDeclaration();
            Declaration d = new Declaration();
            d.setBorrower(b);
            d.setOutstandingJudgments(srcD.getOutstandingJudgments());
            d.setBankruptcy(srcD.getBankruptcy());
            d.setForeclosure(srcD.getForeclosure());
            d.setLawsuit(srcD.getLawsuit());
            d.setLoanForeclosure(srcD.getLoanForeclosure());
            d.setPresentlyDelinquent(srcD.getPresentlyDelinquent());
            d.setAlimonyChildSupport(srcD.getAlimonyChildSupport());
            d.setBorrowingDownPayment(srcD.getBorrowingDownPayment());
            d.setComakerEndorser(srcD.getComakerEndorser());
            d.setUsCitizen(srcD.getUsCitizen());
            d.setPermanentResident(srcD.getPermanentResident());
            d.setIntentToOccupy(srcD.getIntentToOccupy());
            d.setHmdaRace(srcD.getHmdaRace());
            d.setHmdaRaceRefusal(srcD.getHmdaRaceRefusal());
            d.setHmdaEthnicity(srcD.getHmdaEthnicity());
            d.setHmdaEthnicityRefusal(srcD.getHmdaEthnicityRefusal());
            d.setHmdaEthnicityOrigin(srcD.getHmdaEthnicityOrigin());
            d.setHmdaSex(srcD.getHmdaSex());
            d.setHmdaSexRefusal(srcD.getHmdaSexRefusal());
            d.setApplicationTakenMethod(srcD.getApplicationTakenMethod());
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
