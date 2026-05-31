package com.msfg.mortgage.mismo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msfg.mortgage.model.Borrower;
import com.msfg.mortgage.model.Liability;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.mismo.parse.LinkContext;

import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseDecimal;
import static com.msfg.mortgage.mismo.parse.MismoNodes.first;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluck;
import static com.msfg.mortgage.mismo.parse.MismoNodes.textOf;
import com.msfg.mortgage.mismo.parse.MismoXml;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Parses a MISMO 3.4 XML file and merges it into the local database. Tolerant by design:
 *   - missing sections are silently skipped;
 *   - extra elements (LP-specific extensions, closing-stage data we don't model) are ignored;
 *   - <b>always-overwrite</b> for fields we do model — including borrower name and SSN, per
 *     the agreed merge rule. Drift protection is the importer's responsibility, but it's done
 *     at the controller layer (compare {@code <CreatedDatetime>} vs {@code updatedDate}).
 *
 * <p>v1 covers the round-trip core:
 *   - loan identifiers (R-number / investor / MERS)
 *   - loan amount, type, purpose
 *   - subject property (address, value, year, units, type)
 *   - borrower individuals (name, DOB, marital, SSN, contact)
 *   - liabilities (whole-list replace — these come fresh from credit pull)
 *
 * <p>Out of scope for v1 (extend later):
 *   employment, income, residences, assets, declarations, HMDA government monitoring.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MismoImporter {

    private final LoanApplicationRepository loanApplicationRepository;
    private final com.msfg.mortgage.repository.HousingExpenseRepository housingExpenseRepository;
    private final com.msfg.mortgage.repository.PurchaseCreditRepository purchaseCreditRepository;
    private final BorrowerSectionImporter borrowerSectionImporter;
    private final PropertySectionImporter propertySectionImporter;
    private final AssetSectionImporter assetSectionImporter;
    private final ReoSectionImporter reoSectionImporter;
    private final ClosingSectionImporter closingSectionImporter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Result of a single import. {@link #fileCreatedDatetime} is exposed so the caller can
     *  detect drift before deciding to commit. */
    public record ImportResult(
            LoanApplication updated,
            LocalDateTime fileCreatedDatetime,
            List<FieldChange> changes,
            String fieldsChangedSummaryJson
    ) {
        public int changeCount() { return changes.size(); }
    }

    public record FieldChange(String path, String before, String after) {}

    /**
     * Parse the file and return its {@code <CreatedDatetime>} without touching the DB.
     * Used by the controller to do the drift-warning preview before committing.
     */
    public LocalDateTime peekCreatedDatetime(InputStream xml) throws IOException {
        try {
            Document doc = MismoXml.parse(xml);
            return MismoXml.readCreatedDatetime(doc);
        } catch (Exception e) {
            throw new IOException("Failed to parse MISMO header: " + e.getMessage(), e);
        }
    }

    /**
     * Parse and apply the import, persisting changes. Returns a summary of which fields
     * actually changed (for the audit row).
     */
    @Transactional
    public ImportResult importInto(LoanApplication la, InputStream xml) throws IOException {
        try {
            Document doc = MismoXml.parse(xml);
            LocalDateTime fileCreated = MismoXml.readCreatedDatetime(doc);
            List<FieldChange> changes = new ArrayList<>();

            // Index xlink:label → element + the RELATIONSHIPS arcs once. Lets us
            // route DEAL-level ASSETs to the right borrower and pull income off
            // the CURRENT_INCOME_ITEM that's linked to a given EMPLOYER.
            LinkContext links = LinkContext.from(doc);

            applyLoanIdentifiers(doc, la, changes);
            applyLoanFields(doc, la, changes);
            propertySectionImporter.apply(doc, la, changes);  // property + loan terms
            borrowerSectionImporter.apply(doc, la, links, changes);
            assetSectionImporter.apply(doc, la, links, changes);   // after borrowers — needs them to exist
            reoSectionImporter.apply(doc, la, links, changes);     // REOs live inside DEAL/ASSETS, not PARTY
            applyLiabilities(doc, la, links, changes);
            applyHousingExpenses(doc, la, changes); // dashboard PITIA breakdown
            applyPurchaseCredits(doc, la, changes); // earnest money, seller credit, etc.
            // Closing-stage import (closing date, MI, hazard insurance, FEE_INFORMATION/FEES).
            // No-op on URLA-only files.
            closingSectionImporter.apply(doc, la, changes);

            // Persist parent + cascading child changes
            LoanApplication saved = loanApplicationRepository.save(la);

            String summaryJson = changes.isEmpty() ? "[]" : changesToJson(changes);
            return new ImportResult(saved, fileCreated, changes, summaryJson);
        } catch (javax.xml.parsers.ParserConfigurationException | XPathExpressionException e) {
            throw new IOException("Failed to parse/walk MISMO file: " + e.getMessage(), e);
        } catch (org.xml.sax.SAXException e) {
            throw new IOException("Malformed XML: " + e.getMessage(), e);
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Section appliers
    // ───────────────────────────────────────────────────────────────────────────

    private void applyLoanIdentifiers(Document doc, LoanApplication la, List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList ids = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='LOAN_IDENTIFIER']", doc, XPathConstants.NODESET);
        for (int i = 0; i < ids.getLength(); i++) {
            Element e = (Element) ids.item(i);
            String value = textOf(e, "LoanIdentifier");
            String type = textOf(e, "LoanIdentifierType");
            if (value == null || type == null) continue;
            switch (type) {
                case "LenderLoan" -> set(la::getLendingpadLoanNumber, la::setLendingpadLoanNumber,
                        value, "lendingpadLoanNumber", changes);
                case "InvestorLoan" -> set(la::getInvestorLoanNumber, la::setInvestorLoanNumber,
                        value, "investorLoanNumber", changes);
                case "MERS_MIN" -> set(la::getMersMin, la::setMersMin,
                        value, "mersMin", changes);
                case "Other" -> {
                    String desc = textOf(e, "LoanIdentifierTypeOtherDescription");
                    if ("MSFGApplicationNumber".equals(desc)) {
                        set(la::getApplicationNumber, la::setApplicationNumber,
                                value, "applicationNumber", changes);
                    }
                }
                default -> { /* unknown type — ignore */ }
            }
        }
    }

    private void applyLoanFields(Document doc, LoanApplication la, List<FieldChange> changes)
            throws XPathExpressionException {
        Element loan = first(doc, "//*[local-name()='LOAN']");
        if (loan == null) return;

        String purpose = pluck(loan, ".//*[local-name()='LoanPurposeType']");
        if (purpose != null) set(la::getLoanPurpose, la::setLoanPurpose, purpose, "loanPurpose", changes);

        String type = pluck(loan, ".//*[local-name()='MortgageType']");
        if (type != null) set(la::getLoanType, la::setLoanType, type, "loanType", changes);

        String amount = pluck(loan, ".//*[local-name()='BaseLoanAmount']");
        if (amount != null) {
            BigDecimal newAmt = new BigDecimal(amount);
            BigDecimal oldAmt = la.getLoanAmount();
            if (!Objects.equals(oldAmt, newAmt)) {
                changes.add(new FieldChange("loanAmount",
                        oldAmt == null ? null : oldAmt.toPlainString(), newAmt.toPlainString()));
                la.setLoanAmount(newAmt);
            }
        }
    }

    /**
     * Liabilities are wholesale-replaced on import — these come from LendingPad's credit pull
     * after the borrower submits, and represent the authoritative set. Borrowers don't curate
     * liabilities directly in the application form anyway.
     */
    private void applyLiabilities(Document doc, LoanApplication la, LinkContext links,
                                   List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList items = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='LIABILITY']", doc, XPathConstants.NODESET);
        if (items.getLength() == 0) return;  // no liabilities section → leave existing untouched

        int previous = la.getLiabilities() == null ? 0 : la.getLiabilities().size();

        // Wipe existing rows; the JPA cascade on LoanApplication.liabilities is `orphanRemoval=true`
        // so removing from the list deletes the rows on save.
        if (la.getLiabilities() != null) {
            la.getLiabilities().clear();
        }

        List<Borrower> borrowers = la.getBorrowers();
        for (int i = 0; i < items.getLength(); i++) {
            Element li = (Element) items.item(i);
            Liability l = new Liability();
            l.setApplication(la);
            l.setAccountNumber(pluck(li, ".//*[local-name()='LiabilityAccountIdentifier']"));
            l.setLiabilityType(pluck(li, ".//*[local-name()='LiabilityType']"));
            l.setMonthlyPayment(parseDecimal(pluck(li, ".//*[local-name()='LiabilityMonthlyPaymentAmount']")));
            l.setUnpaidBalance(parseDecimal(pluck(li, ".//*[local-name()='LiabilityUnpaidBalanceAmount']")));
            l.setCreditorName(pluck(li, ".//*[local-name()='LIABILITY_HOLDER']/*[local-name()='NAME']/*[local-name()='FullName']"));
            l.setPayoffStatus(false);
            l.setToBePaidOff(false);

            // Owner: route the LIABILITY's xlink:label through the same arc-by-role
            // machinery used for assets. LP labels each LIABILITY (e.g. xlink:label=
            // "LIABILITY_5") and adds an arc to the owning Borrower's ROLE.
            if (borrowers != null && !borrowers.isEmpty()) {
                Borrower owner = AssetSectionImporter.resolveAssetOwner(li, links, borrowers);
                if (owner != null) l.setBorrower(owner);
            }

            // Exclusion: LP marks "don't include in DTI" via LiabilityExclusionIndicator.
            // We map true → "Omit". The LO can override to Payoff / Duplicate in the form.
            String excluded = pluck(li, ".//*[local-name()='LiabilityExclusionIndicator']");
            if ("true".equalsIgnoreCase(excluded)) {
                l.setExclusionReason("Omit");
            } else {
                String payoffFlag = pluck(li, ".//*[local-name()='LiabilityPayoffStatusIndicator']");
                if ("true".equalsIgnoreCase(payoffFlag)) {
                    l.setExclusionReason("Payoff");
                    l.setToBePaidOff(true);
                }
            }

            la.getLiabilities().add(l);
        }
        if (previous != items.getLength()) {
            changes.add(new FieldChange("liabilities.count",
                    String.valueOf(previous), String.valueOf(items.getLength())));
        } else {
            changes.add(new FieldChange("liabilities", "<replaced>", "<replaced (count unchanged)>"));
        }
    }

    /**
     * Loan Dashboard: proposed/present housing expenses (P&I, RE tax, MI, HOA, etc.).
     * Wholesale-replace per loan — re-importing the same MISMO is idempotent.
     */
    private void applyHousingExpenses(org.w3c.dom.Document doc, LoanApplication la, List<FieldChange> changes)
            throws XPathExpressionException {
        if (la.getId() == null) return;
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='HOUSING_EXPENSES']/*[local-name()='HOUSING_EXPENSE']",
                doc, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;

        housingExpenseRepository.deleteByApplicationId(la.getId());

        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element e = (Element) nodes.item(i);
            String type = pluck(e, ".//*[local-name()='HousingExpenseType']");
            String timing = pluck(e, ".//*[local-name()='HousingExpenseTimingType']");
            BigDecimal amount = parseDecimal(pluck(e, ".//*[local-name()='HousingExpensePaymentAmount']"));
            if (type == null && amount == null) continue;

            com.msfg.mortgage.model.HousingExpense he = com.msfg.mortgage.model.HousingExpense.builder()
                    .applicationId(la.getId())
                    .expenseType(type)
                    .timingType(timing)
                    .paymentAmount(amount)
                    .sequenceNumber(i + 1)
                    .build();
            housingExpenseRepository.save(he);
            kept++;
        }
        if (kept > 0) {
            changes.add(new FieldChange("housingExpenses", "<replaced>", kept + " row(s)"));
        }
    }

    /**
     * Loan Dashboard: PURCHASE_CREDITS rows (earnest money, seller credit, lender credit).
     * Wholesale-replace per loan. Empty PURCHASE_CREDIT placeholder elements are skipped —
     * LP commonly emits a trailing empty &lt;PURCHASE_CREDIT/&gt; in these blocks.
     */
    private void applyPurchaseCredits(org.w3c.dom.Document doc, LoanApplication la, List<FieldChange> changes)
            throws XPathExpressionException {
        if (la.getId() == null) return;
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='PURCHASE_CREDITS']/*[local-name()='PURCHASE_CREDIT']",
                doc, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;

        purchaseCreditRepository.deleteByApplicationId(la.getId());

        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element e = (Element) nodes.item(i);
            String type = pluck(e, ".//*[local-name()='PurchaseCreditType']");
            BigDecimal amount = parseDecimal(pluck(e, ".//*[local-name()='PurchaseCreditAmount']"));
            String source = pluck(e, ".//*[local-name()='PurchaseCreditSourceType']");
            // Skip the empty placeholders LP loves emitting
            if (type == null && amount == null) continue;

            com.msfg.mortgage.model.PurchaseCredit pc = com.msfg.mortgage.model.PurchaseCredit.builder()
                    .applicationId(la.getId())
                    .creditType(type != null ? type : "Other")
                    .amount(amount)
                    .source(source)
                    .sequenceNumber(i + 1)
                    .build();
            purchaseCreditRepository.save(pc);
            kept++;
        }
        if (kept > 0) {
            changes.add(new FieldChange("purchaseCredits", "<replaced>", kept + " row(s)"));
        }
    }


    // ───────────────────────────────────────────────────────────────────────────
    // Parsing + utility helpers
    // ───────────────────────────────────────────────────────────────────────────


    /** Generic setter that records a change if the value differs. */
    private static <T> void set(java.util.function.Supplier<T> getter, java.util.function.Consumer<T> setter,
                                T newValue, String path, List<FieldChange> changes) {
        T oldValue = getter.get();
        if (!Objects.equals(oldValue, newValue)) {
            changes.add(new FieldChange(path,
                    oldValue == null ? null : oldValue.toString(),
                    newValue == null ? null : newValue.toString()));
            setter.accept(newValue);
        }
    }

    private String changesToJson(List<FieldChange> changes) {
        try {
            return objectMapper.writeValueAsString(changes.stream()
                    .map(c -> Map.of(
                            "path", c.path(),
                            "before", c.before() == null ? "" : c.before(),
                            "after", c.after() == null ? "" : c.after()))
                    .toList());
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

}
