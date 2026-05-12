package com.msfg.mortgage.mismo;

import com.msfg.mortgage.model.ClosingFee;
import com.msfg.mortgage.model.ClosingInformation;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.repository.ClosingFeeRepository;
import com.msfg.mortgage.repository.ClosingInformationRepository;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import com.msfg.mortgage.mismo.parse.MismoXml;

import static com.msfg.mortgage.mismo.parse.MismoCoerce.firstNonNull;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseBool;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseDecimal;
import static com.msfg.mortgage.mismo.parse.MismoNodes.first;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluck;

/**
 * Closing-stage section of a MISMO 3.4 import — owns the
 * {@link ClosingInformation} row (one per loan) and the {@link ClosingFee}
 * list (replace-all).
 *
 * <p>URLA-only files carry none of this data; the apply() entry point is a
 * no-op there. Closing-stage MISMOs from LP carry the closing date, hazard-
 * insurance flag, MI source/financed-premium amounts, and 15–30 FEE rows.
 *
 * <p>Extracted from {@link MismoImporter} as part of audit item CR-2.
 * Behavior is unchanged — the orchestrator now delegates instead of inlining.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClosingSectionImporter {

    private final LoanApplicationRepository loanApplicationRepository;
    private final ClosingInformationRepository closingInformationRepository;
    private final ClosingFeeRepository closingFeeRepository;

    /** Single entry point — runs both the closing-information row update and the
     *  fee replace-all. The orchestrator calls this once per import. */
    public void apply(Document doc, LoanApplication la, List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        applyClosingInformation(doc, la, changes);
        applyClosingFees(doc, la, changes);
    }

    // ── ClosingInformation ────────────────────────────────────────────────

    void applyClosingInformation(Document doc, LoanApplication la, List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        if (la.getId() == null) return;

        String closingDateRaw    = pluck(doc, "//*[local-name()='CLOSING_INFORMATION_DETAIL']/*[local-name()='LoanEstimatedClosingDate']");
        String hazardEscrowedRaw = pluck(doc, "//*[local-name()='HAZARD_INSURANCE']/*[local-name()='HazardInsuranceEscrowedIndicator']");
        String miSourceType      = pluck(doc, "//*[local-name()='MI_DATA_DETAIL']/*[local-name()='MISourceType']");
        String miFinancedRaw     = pluck(doc, "//*[local-name()='MI_DATA_DETAIL']/*[local-name()='MIPremiumFinancedAmount']");

        // If none of the closing-stage fields are present, this is a URLA-only file — bail.
        if (closingDateRaw == null && hazardEscrowedRaw == null && miSourceType == null && miFinancedRaw == null) {
            return;
        }

        // @MapsId on ClosingInformation derives loanApplicationId from application.id at
        // flush time, but Hibernate refuses to cascade through a detached association.
        // Fetch a managed proxy via findById so the assigned PK + the FK both
        // resolve cleanly without re-persisting the parent.
        LoanApplication managed = loanApplicationRepository.findById(la.getId()).orElseThrow();
        ClosingInformation ci = closingInformationRepository.findByLoanApplicationId(la.getId())
                .orElseGet(() -> {
                    ClosingInformation fresh = new ClosingInformation();
                    fresh.setApplication(managed);
                    return fresh;
                });

        if (closingDateRaw != null) {
            try {
                LocalDate parsed = LocalDate.parse(closingDateRaw);
                if (!Objects.equals(ci.getClosingDate(), parsed)) {
                    changes.add(new MismoImporter.FieldChange("closing.closingDate",
                            ci.getClosingDate() == null ? null : ci.getClosingDate().toString(),
                            parsed.toString()));
                    ci.setClosingDate(parsed);
                }
            } catch (Exception ignore) { /* malformed → leave alone */ }
        }
        if (hazardEscrowedRaw != null) {
            Boolean parsed = parseBool(hazardEscrowedRaw);
            if (parsed != null && !Objects.equals(ci.getHazardInsuranceEscrowed(), parsed)) {
                changes.add(new MismoImporter.FieldChange("closing.hazardInsuranceEscrowed",
                        String.valueOf(ci.getHazardInsuranceEscrowed()), parsed.toString()));
                ci.setHazardInsuranceEscrowed(parsed);
            }
        }
        if (miSourceType != null && !Objects.equals(ci.getMiType(), miSourceType)) {
            changes.add(new MismoImporter.FieldChange("closing.miType", ci.getMiType(), miSourceType));
            ci.setMiType(miSourceType);
        }
        if (miFinancedRaw != null) {
            BigDecimal parsed = parseDecimal(miFinancedRaw);
            if (parsed != null && !Objects.equals(ci.getMiUpfrontAmount(), parsed)) {
                changes.add(new MismoImporter.FieldChange("closing.miUpfrontAmount",
                        ci.getMiUpfrontAmount() == null ? null : ci.getMiUpfrontAmount().toString(),
                        parsed.toString()));
                ci.setMiUpfrontAmount(parsed);
            }
        }

        closingInformationRepository.save(ci);
    }

    // ── ClosingFees ───────────────────────────────────────────────────────

    /**
     * Replace-all import of {@code <FEE>} entries from {@code FEE_INFORMATION/FEES}.
     * Closing-stage MISMO carries 15–30 itemized fees (origination, MI upfront,
     * appraisal, title endorsements, recording, transfer tax, etc.). Each row
     * becomes one {@link ClosingFee}.
     *
     * <p>URLA-only files have no FEES — this is a no-op there.
     *
     * <p>Mapping per FEE:
     * <ul>
     *   <li>{@code feeType} ← {@code FeeType@DisplayLabelText} or {@code FeeType} text</li>
     *   <li>{@code feeAmount} ← {@code FeeActualTotalAmount}</li>
     *   <li>{@code paidTo} ← {@code FEE_PAID_TO/LEGAL_ENTITY/.../FullName}, falling back to {@code FeePaidToType}</li>
     *   <li>{@code paidBy} ← first {@code FEE_PAYMENT/FeePaymentPaidByType}</li>
     *   <li>{@code description} ← {@code FeeDescription}</li>
     * </ul>
     */
    void applyClosingFees(Document doc, LoanApplication la, List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        if (la.getId() == null) return;
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='FEE_INFORMATION']/*[local-name()='FEES']/*[local-name()='FEE']",
                doc, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;

        closingFeeRepository.deleteByApplicationId(la.getId());
        // Use a managed reference for the FK (see applyClosingInformation note).
        LoanApplication managed = loanApplicationRepository.findById(la.getId()).orElseThrow();

        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element fee = (Element) nodes.item(i);
            String typeLabel = null;
            Element typeEl = first(fee, ".//*[local-name()='FeeType']");
            if (typeEl != null) {
                String label = typeEl.getAttribute("DisplayLabelText");
                typeLabel = (label != null && !label.isBlank()) ? label : typeEl.getTextContent().trim();
            }
            BigDecimal amount = parseDecimal(pluck(fee, ".//*[local-name()='FeeActualTotalAmount']"));
            String paidTo = firstNonNull(
                    pluck(fee, ".//*[local-name()='FEE_PAID_TO']//*[local-name()='LEGAL_ENTITY_DETAIL']/*[local-name()='FullName']"),
                    pluck(fee, ".//*[local-name()='FeePaidToType']"));
            String paidBy = pluck(fee, ".//*[local-name()='FEE_PAYMENT']/*[local-name()='FeePaymentPaidByType']");
            String description = pluck(fee, ".//*[local-name()='FeeDescription']");

            // Skip placeholder FEEs that LP sometimes emits with no type and no amount
            if ((typeLabel == null || typeLabel.isBlank()) && amount == null) continue;

            ClosingFee cf = ClosingFee.builder()
                    .application(managed)
                    .sequenceNumber(i + 1)
                    .feeType(typeLabel != null ? typeLabel : "Other")
                    .feeAmount(amount)
                    .paidTo(paidTo)
                    .paidBy(paidBy)
                    .description(description)
                    .build();
            closingFeeRepository.save(cf);
            kept++;
        }
        if (kept > 0) {
            changes.add(new MismoImporter.FieldChange("closingFees", "<replaced>", kept + " row(s)"));
        }
    }
}
