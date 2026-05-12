package com.msfg.mortgage.mismo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msfg.mortgage.model.Asset;
import com.msfg.mortgage.model.Borrower;
import com.msfg.mortgage.model.ClosingFee;
import com.msfg.mortgage.model.ClosingInformation;
import com.msfg.mortgage.model.Declaration;
import com.msfg.mortgage.model.Employment;
import com.msfg.mortgage.model.IncomeSource;
import com.msfg.mortgage.model.Liability;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.model.Property;
import com.msfg.mortgage.model.REOProperty;
import com.msfg.mortgage.model.Residence;
import com.msfg.mortgage.mismo.parse.LinkContext;

import static com.msfg.mortgage.mismo.parse.MismoCoerce.firstNonNull;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.normalizeAssetType;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.normalizePhone;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.normalizeZip;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseBool;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseDecimal;
import static com.msfg.mortgage.mismo.parse.MismoNodes.first;
import static com.msfg.mortgage.mismo.parse.MismoNodes.parseSeq;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluck;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluckTaxId;
import static com.msfg.mortgage.mismo.parse.MismoNodes.textOf;
import com.msfg.mortgage.mismo.parse.MismoXml;
import com.msfg.mortgage.repository.BorrowerRepository;
import com.msfg.mortgage.repository.LiabilityRepository;
import com.msfg.mortgage.repository.LoanApplicationRepository;
import com.msfg.mortgage.repository.PropertyRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
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
    private final BorrowerRepository borrowerRepository;
    private final PropertyRepository propertyRepository;
    private final LiabilityRepository liabilityRepository;
    private final com.msfg.mortgage.repository.LoanTermsRepository loanTermsRepository;
    private final com.msfg.mortgage.repository.HousingExpenseRepository housingExpenseRepository;
    private final com.msfg.mortgage.repository.PurchaseCreditRepository purchaseCreditRepository;
    private final BorrowerSectionImporter borrowerSectionImporter;
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
            applyProperty(doc, la, changes);
            borrowerSectionImporter.apply(doc, la, links, changes);
            applyAssets(doc, la, links, changes);   // after borrowers — needs them to exist
            applyLiabilities(doc, la, changes);
            applyLoanTerms(doc, la, changes);       // populates the dashboard's "this loan" row
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

    private void applyProperty(Document doc, LoanApplication la, List<FieldChange> changes)
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
                    changes.add(new FieldChange("property.yearBuilt",
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
                    changes.add(new FieldChange("property.unitsCount",
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
                    changes.add(new FieldChange("property.propertyValue",
                            p.getPropertyValue() == null ? null : p.getPropertyValue().toPlainString(),
                            newV.toPlainString()));
                    p.setPropertyValue(newV);
                }
            } catch (NumberFormatException ignored) { }
        }

        // Purchase price (separate from estimated/appraised value). Only present on purchase loans.
        BigDecimal salesAmt = parseDecimal(pluck(subj, ".//*[local-name()='SalesContractAmount']"));
        if (salesAmt != null && !Objects.equals(p.getPurchasePrice(), salesAmt)) {
            changes.add(new FieldChange("property.purchasePrice",
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


    /**
     * Walk DEAL/ASSETS/ASSET (the canonical MISMO 3.4 location) and route each asset to
     * its owning borrower. Routing strategy:
     *   1. xlink:label of the ASSET → arcsByFrom → label of the linked ROLE → walk up
     *      to that ROLE's parent PARTY → match by SequenceNumber to a borrower we've
     *      already created.
     *   2. Single-borrower fallback: when only one borrower exists on the loan, every
     *      asset maps to that borrower (LP often omits the relationship arc in this case).
     *   3. Multi-borrower with no resolvable arc → log a warning and skip.
     *
     * Wholesale-replace: each borrower's asset list is cleared on the first asset that
     * lands for them, so re-importing the same MISMO is idempotent.
     */
    private void applyAssets(Document doc, LoanApplication la, LinkContext links,
                             List<FieldChange> changes) throws XPathExpressionException {
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='ASSETS']/*[local-name()='ASSET']", doc, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;

        List<Borrower> borrowers = la.getBorrowers();
        if (borrowers == null || borrowers.isEmpty()) return;

        Map<Long, List<Asset>> bucket = new HashMap<>();
        for (Borrower b : borrowers) bucket.put(b.getId() == null ? -1L : b.getId(), new ArrayList<>());

        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element a = (Element) nodes.item(i);
            String type = pluck(a, ".//*[local-name()='AssetType']");
            BigDecimal value = parseDecimal(pluck(a, ".//*[local-name()='AssetCashOrMarketValueAmount']"));
            if (type == null && value == null) continue;

            Borrower owner = resolveAssetOwner(a, links, borrowers);
            if (owner == null) {
                log.warn("MISMO ASSET could not be routed to a borrower; skipping. label={}",
                        a.getAttributeNS(LinkContext.XLINK_NS, "label"));
                continue;
            }

            Asset asset = new Asset();
            asset.setBorrower(owner);
            asset.setAssetType(normalizeAssetType(type));
            asset.setAccountNumber(pluck(a, ".//*[local-name()='AssetAccountIdentifier']"));
            asset.setBankName(pluck(a, ".//*[local-name()='FullName']"));
            // assets.asset_value is NOT NULL in the schema; some LP exports omit the value
            // on identification-only assets (e.g. life insurance with no cash value listed).
            // Default to zero so the row persists; downstream UI shows "$0" which is correct
            // for those cases and surfaces "this asset needs an amount" to the LO.
            asset.setAssetValue(value != null ? value : BigDecimal.ZERO);
            String used = pluck(a, ".//*[local-name()='AssetEntryUsedForDownPaymentIndicator']");
            asset.setUsedForDownpayment(used != null && Boolean.parseBoolean(used));

            bucket.get(owner.getId() == null ? -1L : owner.getId()).add(asset);
            kept++;
        }

        // Replace strategy: only borrowers who got new assets have their list reset.
        // Borrowers with no assets in this MISMO keep what was there (common when only
        // primary borrower has bank statements on file).
        for (Borrower b : borrowers) {
            List<Asset> incoming = bucket.get(b.getId() == null ? -1L : b.getId());
            if (incoming.isEmpty()) continue;
            if (b.getAssets() == null) b.setAssets(new ArrayList<>());
            b.getAssets().clear();
            b.getAssets().addAll(incoming);
        }

        if (kept > 0) {
            changes.add(new FieldChange("assets", "<replaced>", kept + " row(s)"));
        }
    }

    /** Returns the borrower that owns an asset, or null if unresolvable. */
    private Borrower resolveAssetOwner(Element asset, LinkContext links, List<Borrower> borrowers) {
        // xlink-based routing
        String assetLabel = asset.getAttributeNS(LinkContext.XLINK_NS, "label");
        if (!assetLabel.isEmpty()) {
            String roleLabel = links.arcsByFrom.get(assetLabel);
            if (roleLabel != null) {
                Element role = links.elementsByLabel.get(roleLabel);
                if (role != null) {
                    org.w3c.dom.Node n = role;
                    while (n != null && !"PARTY".equals(n.getLocalName())) n = n.getParentNode();
                    if (n != null) {
                        int seq = parseSeq((Element) n, 0);
                        for (Borrower b : borrowers) {
                            if (b.getSequenceNumber() != null && b.getSequenceNumber() == seq) return b;
                        }
                    }
                }
            }
        }
        // Single-borrower fallback
        if (borrowers.size() == 1) return borrowers.get(0);
        return null;
    }


    /**
     * Liabilities are wholesale-replaced on import — these come from LendingPad's credit pull
     * after the borrower submits, and represent the authoritative set. Borrowers don't curate
     * liabilities directly in the application form anyway.
     */
    private void applyLiabilities(Document doc, LoanApplication la, List<FieldChange> changes)
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
     * Loan Dashboard: terms (rate, amount, amortization, lien priority, app-received date).
     * Single row per application; upsert semantics. The borrower-facing
     * {@code LoanApplication.loanAmount} keeps mirroring {@code BaseLoanAmount} so the
     * application list view continues to work; this entity is the LO's authoritative copy.
     */
    private void applyLoanTerms(org.w3c.dom.Document doc, LoanApplication la, List<FieldChange> changes)
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
        changes.add(new FieldChange("loanTerms", "<upserted>", "1 row"));
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

    /** String version — handles "" → null normalization. */
    private static void stringSet(java.util.function.Supplier<String> getter,
                                  java.util.function.Consumer<String> setter,
                                  String newValue, String path, List<FieldChange> changes) {
        String normalized = (newValue == null || newValue.isBlank()) ? null : newValue;
        String oldValue = getter.get();
        if (!Objects.equals(oldValue, normalized)) {
            changes.add(new FieldChange(path, oldValue, normalized));
            setter.accept(normalized);
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
