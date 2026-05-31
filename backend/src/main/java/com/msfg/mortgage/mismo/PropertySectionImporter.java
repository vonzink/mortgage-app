package com.msfg.mortgage.mismo;

import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.model.Property;
import com.msfg.mortgage.mismo.parse.MismoXml;
import com.msfg.mortgage.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import static com.msfg.mortgage.mismo.parse.MismoCoerce.firstNonNull;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseDecimal;
import static com.msfg.mortgage.mismo.parse.MismoNodes.first;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluck;

/**
 * Subject-property and loan-terms sections of a MISMO 3.4 import.
 *
 * <p>Extracted from {@link MismoImporter} as part of audit item CR-2.
 * Behavior preserved; the orchestrator now delegates.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PropertySectionImporter {

    private final PropertyRepository propertyRepository;
    private final com.msfg.mortgage.repository.LoanTermsRepository loanTermsRepository;

    /**
     * Single entry point for property + loan terms.
     */
    public void apply(Document doc, LoanApplication la, List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        applyProperty(doc, la, changes);
        applyLoanTerms(doc, la, changes);
    }

    // ── Subject property ────────────────────────────────────────────────

    private void applyProperty(Document doc, LoanApplication la, List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        Element subj = first(doc, "//*[local-name()='SUBJECT_PROPERTY']");
        if (subj == null) return;

        Property p = la.getProperty();
        if (p == null) {
            p = new Property();
            p.setApplication(la);
            la.setProperty(p);
        }

        Element addr = (Element) MismoXml.xp().evaluate(".//*[local-name()='ADDRESS']", subj, XPathConstants.NODE);
        if (addr != null) {
            stringSet(p::getAddressLine, p::setAddressLine,
                    pluck(addr, "*[local-name()='AddressLineText']"), "property.addressLine", changes);
            stringSet(p::getCity, p::setCity,
                    pluck(addr, "*[local-name()='CityName']"), "property.city", changes);
            stringSet(p::getState, p::setState,
                    pluck(addr, "*[local-name()='StateCode']"), "property.state", changes);
            stringSet(p::getZipCode, p::setZipCode,
                    pluck(addr, "*[local-name()='PostalCode']"), "property.zipCode", changes);
            stringSet(p::getCounty, p::setCounty,
                    pluck(addr, "*[local-name()='CountyName']"), "property.county", changes);
        }
        stringSet(p::getPropertyType, p::setPropertyType,
                pluck(subj, ".//*[local-name()='PropertyUsageType']"), "property.propertyType", changes);
        stringSet(p::getConstructionType, p::setConstructionType,
                pluck(subj, ".//*[local-name()='ConstructionMethodType']"), "property.constructionType", changes);

        String yr = pluck(subj, ".//*[local-name()='PropertyStructureBuiltYear']");
        if (yr != null) {
            try {
                Integer newY = Integer.valueOf(yr);
                if (!Objects.equals(p.getYearBuilt(), newY)) {
                    changes.add(new MismoImporter.FieldChange("property.yearBuilt",
                            String.valueOf(p.getYearBuilt()), newY.toString()));
                    p.setYearBuilt(newY);
                }
            } catch (NumberFormatException ignored) { }
        }

        String units = pluck(subj, ".//*[local-name()='FinancedUnitCount']");
        if (units != null) {
            try {
                Integer newU = Integer.valueOf(units);
                if (!Objects.equals(p.getUnitsCount(), newU)) {
                    changes.add(new MismoImporter.FieldChange("property.unitsCount",
                            String.valueOf(p.getUnitsCount()), newU.toString()));
                    p.setUnitsCount(newU);
                }
            } catch (NumberFormatException ignored) { }
        }

        // Property value: priority order matches what LendingPad's exports actually contain.
        //   1. PropertyValuationAmount (formal appraisal — only present after appraisal)
        //   2. PropertyEstimatedValueAmount (LP's initial estimate, always present)
        //   3. SalesContractAmount (purchase price, useful for new purchases)
        String pv = firstNonNull(
                pluck(subj, ".//*[local-name()='PropertyValuationAmount']"),
                pluck(subj, ".//*[local-name()='PropertyEstimatedValueAmount']"),
                pluck(subj, ".//*[local-name()='SalesContractAmount']")
        );
        if (pv != null) {
            try {
                BigDecimal newV = new BigDecimal(pv);
                if (!Objects.equals(p.getPropertyValue(), newV)) {
                    changes.add(new MismoImporter.FieldChange("property.propertyValue",
                            p.getPropertyValue() == null ? null : p.getPropertyValue().toPlainString(),
                            newV.toPlainString()));
                    p.setPropertyValue(newV);
                }
                // Mirror onto LoanApplication.propertyValue. The form reads this
                // top-level field for the "Purchase Price / Property Value" input,
                // so without the mirror the imported value never shows up in the UI.
                if (!Objects.equals(la.getPropertyValue(), newV)) {
                    changes.add(new MismoImporter.FieldChange("propertyValue",
                            la.getPropertyValue() == null ? null : la.getPropertyValue().toPlainString(),
                            newV.toPlainString()));
                    la.setPropertyValue(newV);
                }
            } catch (NumberFormatException ignored) { }
        }

        // Purchase price (separate from estimated/appraised value). Only present on purchase loans.
        BigDecimal salesAmt = parseDecimal(pluck(subj, ".//*[local-name()='SalesContractAmount']"));
        if (salesAmt != null && !Objects.equals(p.getPurchasePrice(), salesAmt)) {
            changes.add(new MismoImporter.FieldChange("property.purchasePrice",
                    p.getPurchasePrice() == null ? null : p.getPurchasePrice().toPlainString(),
                    salesAmt.toPlainString()));
            p.setPurchasePrice(salesAmt);
        }

        // Attached/Detached + project structure (Condominium / PUD / Cooperative / None).
        stringSet(p::getAttachmentType, p::setAttachmentType,
                pluck(subj, ".//*[local-name()='AttachmentType']"), "property.attachmentType", changes);
        stringSet(p::getProjectType, p::setProjectType,
                pluck(subj, ".//*[local-name()='ProjectLegalStructureType']"), "property.projectType", changes);

        propertyRepository.save(p);
    }

    // ── Loan terms ──────────────────────────────────────────────────────

    /**
     * Loan Dashboard: terms (rate, amount, amortization, lien priority, app-received date).
     * Single row per application; upsert semantics. The borrower-facing
     * {@code LoanApplication.loanAmount} keeps mirroring {@code BaseLoanAmount} so the
     * application list view continues to work; this entity is the LO's authoritative copy.
     */
    private void applyLoanTerms(org.w3c.dom.Document doc, LoanApplication la, List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        Element loan = first(doc, "//*[local-name()='LOAN']");
        if (loan == null || la.getId() == null) return;

        com.msfg.mortgage.model.LoanTerms terms = loanTermsRepository
                .findByApplicationId(la.getId())
                .orElseGet(() -> com.msfg.mortgage.model.LoanTerms.builder()
                        .applicationId(la.getId())
                        .build());

        BigDecimal baseAmt = parseDecimal(pluck(loan, ".//*[local-name()='BaseLoanAmount']"));
        if (baseAmt != null) terms.setBaseLoanAmount(baseAmt);

        BigDecimal noteAmt = parseDecimal(pluck(loan, ".//*[local-name()='NoteAmount']"));
        if (noteAmt != null) terms.setNoteAmount(noteAmt);

        BigDecimal rate = parseDecimal(pluck(loan, ".//*[local-name()='NoteRatePercent']"));
        if (rate != null) terms.setNoteRatePercent(rate);

        String amortType = pluck(loan, ".//*[local-name()='AmortizationType']");
        if (amortType != null) terms.setAmortizationType(amortType);

        String periodCount = pluck(loan, ".//*[local-name()='LoanAmortizationPeriodCount']");
        if (periodCount != null) {
            try { terms.setAmortizationTermMonths(Integer.parseInt(periodCount)); }
            catch (NumberFormatException ignored) { }
        }

        String lien = pluck(loan, ".//*[local-name()='LienPriorityType']");
        if (lien != null) terms.setLienPriorityType(lien);

        String received = pluck(loan, ".//*[local-name()='ApplicationReceivedDate']");
        if (received != null) {
            try { terms.setApplicationReceivedDate(LocalDate.parse(received)); }
            catch (Exception ignored) { }
        }

        // Down payment: prefer an explicit MISMO field if present, else compute.
        // MISMO 3.4 carries it on the LOAN's DOWN_PAYMENTS/DOWN_PAYMENT/DownPaymentAmount;
        // some LP exports omit it. When missing, derive from the property/value/loan delta.
        BigDecimal explicitDown = parseDecimal(pluck(loan, ".//*[local-name()='DownPaymentAmount']"));
        if (explicitDown != null) {
            terms.setDownPaymentAmount(explicitDown);
        } else if (la.getProperty() != null && la.getProperty().getPropertyValue() != null
                && terms.getBaseLoanAmount() != null) {
            BigDecimal derived = la.getProperty().getPropertyValue().subtract(terms.getBaseLoanAmount());
            // Don't store negatives — that would be a bad MISMO file or a refi shape.
            if (derived.signum() >= 0) terms.setDownPaymentAmount(derived);
        }

        loanTermsRepository.save(terms);
        changes.add(new MismoImporter.FieldChange("loanTerms", "<upserted>", "1 row"));
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** String version — handles "" → null normalization. */
    private static void stringSet(java.util.function.Supplier<String> getter,
                                  java.util.function.Consumer<String> setter,
                                  String newValue, String path,
                                  List<MismoImporter.FieldChange> changes) {
        String normalized = (newValue == null || newValue.isBlank()) ? null : newValue;
        String oldValue = getter.get();
        if (!Objects.equals(oldValue, normalized)) {
            changes.add(new MismoImporter.FieldChange(path, oldValue, normalized));
            setter.accept(normalized);
        }
    }
}
