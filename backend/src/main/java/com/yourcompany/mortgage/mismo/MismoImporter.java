package com.yourcompany.mortgage.mismo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.mortgage.model.Asset;
import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.Declaration;
import com.yourcompany.mortgage.model.Employment;
import com.yourcompany.mortgage.model.IncomeSource;
import com.yourcompany.mortgage.model.Liability;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.Property;
import com.yourcompany.mortgage.model.REOProperty;
import com.yourcompany.mortgage.model.Residence;
import com.yourcompany.mortgage.repository.BorrowerRepository;
import com.yourcompany.mortgage.repository.LiabilityRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import com.yourcompany.mortgage.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
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
    private final BorrowerRepository borrowerRepository;
    private final PropertyRepository propertyRepository;
    private final LiabilityRepository liabilityRepository;
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
            Document doc = parse(xml);
            return readCreatedDatetime(doc);
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
            Document doc = parse(xml);
            LocalDateTime fileCreated = readCreatedDatetime(doc);
            List<FieldChange> changes = new ArrayList<>();

            applyLoanIdentifiers(doc, la, changes);
            applyLoanFields(doc, la, changes);
            applyProperty(doc, la, changes);
            applyBorrowers(doc, la, changes);
            applyLiabilities(doc, la, changes);

            // Persist parent + cascading child changes
            LoanApplication saved = loanApplicationRepository.save(la);

            String summaryJson = changes.isEmpty() ? "[]" : changesToJson(changes);
            return new ImportResult(saved, fileCreated, changes, summaryJson);
        } catch (ParserConfigurationException | XPathExpressionException e) {
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
        NodeList ids = (NodeList) xp().evaluate(
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

        Element addr = (Element) xp().evaluate(".//*[local-name()='ADDRESS']", subj, XPathConstants.NODE);
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

        propertyRepository.save(p);
    }

    /**
     * Walk every PARTY in the file. Match against existing borrowers by SequenceNumber attr
     * (or position fallback); create a new borrower row if MISMO has more parties than DB.
     * For each borrower, whole-list-replace the child collections (residences, employment,
     * income, assets, REO) so LP's authoritative data wins.
     */
    private void applyBorrowers(Document doc, LoanApplication la, List<FieldChange> changes)
            throws XPathExpressionException {
        // Only walk PARTYs that are actually Borrowers (skip PropertyOwner, LegalEntity for the LO,
        // title companies, agents, etc.). MISMO marks the role with PartyRoleType=Borrower.
        NodeList parties = (NodeList) xp().evaluate(
                "//*[local-name()='PARTY']" +
                "[.//*[local-name()='ROLE_DETAIL']/*[local-name()='PartyRoleType' and text()='Borrower']]",
                doc, XPathConstants.NODESET);
        if (parties.getLength() == 0) return;

        if (la.getBorrowers() == null) la.setBorrowers(new ArrayList<>());
        List<Borrower> existing = la.getBorrowers();

        for (int i = 0; i < parties.getLength(); i++) {
            Element party = (Element) parties.item(i);
            int seq = parseSeq(party, i + 1);

            Borrower b = findBorrower(existing, seq, i);
            boolean created = false;
            if (b == null) {
                b = new Borrower();
                b.setApplication(la);
                b.setSequenceNumber(seq);
                existing.add(b);
                created = true;
                changes.add(new FieldChange("borrowers." + i, null, "<created>"));
            }

            String prefix = "borrowers." + i + ".";

            // Basic fields
            stringSet(b::getFirstName, b::setFirstName,
                    pluck(party, ".//*[local-name()='FirstName']"), prefix + "firstName", changes);
            stringSet(b::getLastName, b::setLastName,
                    pluck(party, ".//*[local-name()='LastName']"), prefix + "lastName", changes);

            String dob = pluck(party, ".//*[local-name()='BorrowerBirthDate']");
            if (dob != null) {
                try {
                    LocalDate newDob = LocalDate.parse(dob);
                    if (!Objects.equals(b.getBirthDate(), newDob)) {
                        changes.add(new FieldChange(prefix + "birthDate",
                                String.valueOf(b.getBirthDate()), newDob.toString()));
                        b.setBirthDate(newDob);
                    }
                } catch (Exception ignored) { }
            }

            stringSet(b::getMaritalStatus, b::setMaritalStatus,
                    pluck(party, ".//*[local-name()='MaritalStatusType']"), prefix + "maritalStatus", changes);
            stringSet(b::getCitizenshipType, b::setCitizenshipType,
                    pluck(party, ".//*[local-name()='CitizenshipResidencyType']"), prefix + "citizenshipType", changes);

            String dep = pluck(party, ".//*[local-name()='DependentCount']");
            if (dep != null) {
                try {
                    Integer newDep = Integer.valueOf(dep);
                    if (!Objects.equals(b.getDependentsCount(), newDep)) {
                        changes.add(new FieldChange(prefix + "dependentsCount",
                                String.valueOf(b.getDependentsCount()), newDep.toString()));
                        b.setDependentsCount(newDep);
                    }
                } catch (NumberFormatException ignored) { }
            }

            // SSN
            String ssn = pluckTaxId(party, "SocialSecurityNumber");
            if (ssn != null) stringSet(b::getSsn, b::setSsn, ssn, prefix + "ssn", changes);

            // Email + phone (first match per type)
            String email = pluck(party, ".//*[local-name()='ContactPointEmailValue']");
            if (email != null) stringSet(b::getEmail, b::setEmail, email, prefix + "email", changes);
            String phone = normalizePhone(pluck(party, ".//*[local-name()='ContactPointTelephoneValue']"));
            if (phone != null) stringSet(b::getPhone, b::setPhone, phone, prefix + "phone", changes);

            // ── Whole-list replace of child collections ─────────────────────────────
            replaceResidences(party, b, prefix, changes);
            replaceEmployment(party, b, prefix, changes);
            replaceIncomeSources(party, b, prefix, changes);
            replaceAssets(party, b, prefix, changes);
            replaceReoProperties(party, b, prefix, changes);
            replaceDeclaration(party, b, prefix, changes);

            // Save: new borrowers need the parent FK to flush; existing get updated in-place.
            // Because LoanApplication.borrowers cascades ALL with orphanRemoval, the final
            // save on the LA at the controller layer would handle it — but persist now so
            // the borrower has an ID (needed for child FK setup on assets etc.).
            if (created) borrowerRepository.save(b);
        }
    }

    private void replaceResidences(Element party, Borrower b, String prefix, List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList nodes = (NodeList) xp().evaluate(
                ".//*[local-name()='RESIDENCE']", party, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;
        if (b.getResidences() == null) b.setResidences(new ArrayList<>());
        b.getResidences().clear();
        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element r = (Element) nodes.item(i);
            String addr = pluck(r, ".//*[local-name()='AddressLineText']");
            String city = pluck(r, ".//*[local-name()='CityName']");
            // Skip empty placeholder RESIDENCE blocks
            if (addr == null && city == null) continue;
            Residence rec = new Residence();
            rec.setBorrower(b);
            rec.setAddressLine(addr);
            rec.setCity(city);
            rec.setState(pluck(r, ".//*[local-name()='StateCode']"));
            rec.setZipCode(pluck(r, ".//*[local-name()='PostalCode']"));
            rec.setResidencyType(pluck(r, ".//*[local-name()='BorrowerResidencyType']"));
            rec.setResidencyBasis(pluck(r, ".//*[local-name()='BorrowerResidencyBasisType']"));
            String dur = pluck(r, ".//*[local-name()='BorrowerResidencyDurationMonthsCount']");
            try { rec.setDurationMonths(dur == null ? null : Integer.valueOf(dur)); } catch (NumberFormatException ignored) { }
            rec.setMonthlyRent(parseDecimal(pluck(r, ".//*[local-name()='MonthlyRentAmount']")));
            b.getResidences().add(rec);
            kept++;
        }
        if (kept > 0) {
            changes.add(new FieldChange(prefix + "residences", "<replaced>", kept + " row(s)"));
        }
    }

    private void replaceEmployment(Element party, Borrower b, String prefix, List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList nodes = (NodeList) xp().evaluate(
                ".//*[local-name()='EMPLOYER']", party, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;
        if (b.getEmploymentHistory() == null) b.setEmploymentHistory(new ArrayList<>());
        b.getEmploymentHistory().clear();
        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element e = (Element) nodes.item(i);

            String employerName = firstNonNull(
                    pluck(e, ".//*[local-name()='LEGAL_ENTITY_DETAIL']/*[local-name()='FullName']"),
                    pluck(e, ".//*[local-name()='FullName']"));
            String start = pluck(e, ".//*[local-name()='EmploymentStartDate']");

            // Skip totally empty EMPLOYER blocks — LP sometimes emits them as placeholders
            if (employerName == null && start == null) {
                log.debug("Skipping empty EMPLOYER element (no name, no start date)");
                continue;
            }

            Employment emp = new Employment();
            emp.setBorrower(b);
            emp.setSequenceNumber(parseSeq(e, i + 1));
            emp.setEmployerName(employerName);
            emp.setEmployerPhone(normalizePhone(pluck(e, ".//*[local-name()='ContactPointTelephoneValue']")));
            emp.setEmployerAddress(pluck(e, ".//*[local-name()='AddressLineText']"));
            emp.setEmployerCity(pluck(e, ".//*[local-name()='CityName']"));
            emp.setEmployerState(pluck(e, ".//*[local-name()='StateCode']"));
            emp.setEmployerZip(normalizeZip(pluck(e, ".//*[local-name()='PostalCode']")));
            emp.setPosition(pluck(e, ".//*[local-name()='EmploymentPositionDescription']"));
            try { emp.setStartDate(start == null ? null : LocalDate.parse(start)); } catch (Exception ignored) { }
            String end = pluck(e, ".//*[local-name()='EmploymentEndDate']");
            try { emp.setEndDate(end == null ? null : LocalDate.parse(end)); } catch (Exception ignored) { }
            emp.setMonthlyIncome(parseDecimal(pluck(e, ".//*[local-name()='EmploymentMonthlyIncomeAmount']")));
            String status = pluck(e, ".//*[local-name()='EmploymentStatusType']");
            emp.setEmploymentStatus(status);
            emp.setIsPresent(status != null && (status.equalsIgnoreCase("Current") || status.equalsIgnoreCase("Present")));
            String selfEmp = pluck(e, ".//*[local-name()='EmploymentBorrowerSelfEmployedIndicator']");
            emp.setSelfEmployed(selfEmp != null && Boolean.parseBoolean(selfEmp));
            b.getEmploymentHistory().add(emp);
            kept++;
        }
        if (kept > 0) {
            changes.add(new FieldChange(prefix + "employmentHistory", "<replaced>", kept + " row(s)"));
        }
    }

    private void replaceIncomeSources(Element party, Borrower b, String prefix, List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList items = (NodeList) xp().evaluate(
                ".//*[local-name()='CURRENT_INCOME_ITEM']", party, XPathConstants.NODESET);
        if (items.getLength() == 0) return;
        if (b.getIncomeSources() == null) b.setIncomeSources(new ArrayList<>());
        b.getIncomeSources().clear();
        int rowCount = 0;
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            String empInd = pluck(item, ".//*[local-name()='EmploymentIncomeIndicator']");
            // Skip employment-derived income — that's tracked in EMPLOYERS instead
            if ("true".equalsIgnoreCase(empInd)) continue;
            IncomeSource src = new IncomeSource();
            src.setBorrower(b);
            src.setIncomeType(pluck(item, ".//*[local-name()='IncomeType']"));
            src.setMonthlyAmount(parseDecimal(pluck(item, ".//*[local-name()='CurrentIncomeMonthlyTotalAmount']")));
            src.setDescription(pluck(item, ".//*[local-name()='CurrentIncomeOtherTypeDescription']"));
            b.getIncomeSources().add(src);
            rowCount++;
        }
        if (rowCount > 0) {
            changes.add(new FieldChange(prefix + "incomeSources", "<replaced>", rowCount + " row(s)"));
        }
    }

    private void replaceAssets(Element party, Borrower b, String prefix, List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList nodes = (NodeList) xp().evaluate(
                ".//*[local-name()='ASSET']", party, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;
        if (b.getAssets() == null) b.setAssets(new ArrayList<>());
        b.getAssets().clear();
        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element a = (Element) nodes.item(i);
            String type = pluck(a, ".//*[local-name()='AssetType']");
            BigDecimal value = parseDecimal(pluck(a, ".//*[local-name()='AssetCashOrMarketValueAmount']"));
            // Skip placeholder ASSET blocks with no useful data
            if (type == null && value == null) continue;
            Asset asset = new Asset();
            asset.setBorrower(b);
            asset.setAssetType(type);
            asset.setAccountNumber(pluck(a, ".//*[local-name()='AssetAccountIdentifier']"));
            asset.setBankName(pluck(a, ".//*[local-name()='FullName']"));
            asset.setAssetValue(value);
            String used = pluck(a, ".//*[local-name()='AssetEntryUsedForDownPaymentIndicator']");
            asset.setUsedForDownpayment(used != null && Boolean.parseBoolean(used));
            b.getAssets().add(asset);
            kept++;
        }
        if (kept > 0) {
            changes.add(new FieldChange(prefix + "assets", "<replaced>", kept + " row(s)"));
        }
    }

    private void replaceReoProperties(Element party, Borrower b, String prefix, List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList nodes = (NodeList) xp().evaluate(
                ".//*[local-name()='OWNED_PROPERTY']", party, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;
        if (b.getReoProperties() == null) b.setReoProperties(new ArrayList<>());
        b.getReoProperties().clear();
        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element p = (Element) nodes.item(i);
            String addr = pluck(p, ".//*[local-name()='AddressLineText']");
            String city = pluck(p, ".//*[local-name()='CityName']");
            // Skip placeholder OWNED_PROPERTY blocks
            if (addr == null && city == null) continue;
            REOProperty reo = new REOProperty();
            reo.setBorrower(b);
            reo.setSequenceNumber(parseSeq(p, i + 1));
            reo.setAddressLine(addr);
            reo.setCity(city);
            reo.setState(pluck(p, ".//*[local-name()='StateCode']"));
            reo.setZipCode(pluck(p, ".//*[local-name()='PostalCode']"));
            reo.setPropertyType(pluck(p, ".//*[local-name()='PropertyUsageType']"));
            reo.setPropertyValue(parseDecimal(firstNonNull(
                    pluck(p, ".//*[local-name()='PropertyValuationAmount']"),
                    pluck(p, ".//*[local-name()='PropertyEstimatedValueAmount']"))));
            reo.setMonthlyRentalIncome(parseDecimal(pluck(p, ".//*[local-name()='RentalSubjectNetCashFlowAmount']")));
            reo.setMonthlyPayment(parseDecimal(pluck(p, ".//*[local-name()='PropertyMaintenanceExpenseAmount']")));
            reo.setUnpaidBalance(parseDecimal(pluck(p, ".//*[local-name()='PropertyLienUPBAmount']")));
            b.getReoProperties().add(reo);
            kept++;
        }
        if (kept > 0) {
            changes.add(new FieldChange(prefix + "reoProperties", "<replaced>", kept + " row(s)"));
        }
    }

    private void replaceDeclaration(Element party, Borrower b, String prefix, List<FieldChange> changes)
            throws XPathExpressionException {
        Element dd = first(party, ".//*[local-name()='DECLARATION_DETAIL']");
        if (dd == null) return;
        Declaration d = b.getDeclaration();
        if (d == null) {
            d = new Declaration();
            d.setBorrower(b);
            b.setDeclaration(d);
        }
        d.setOutstandingJudgments(parseBool(pluck(dd, "*[local-name()='OutstandingJudgmentsIndicator']")));
        d.setBankruptcy(parseBool(pluck(dd, "*[local-name()='BankruptcyIndicator']")));
        d.setForeclosure(parseBool(pluck(dd, "*[local-name()='PriorPropertyForeclosureCompletedIndicator']")));
        d.setLawsuit(parseBool(pluck(dd, "*[local-name()='PartyToLawsuitIndicator']")));
        d.setLoanForeclosure(parseBool(pluck(dd, "*[local-name()='PriorPropertyDeedInLieuConveyedIndicator']")));
        d.setPresentlyDelinquent(parseBool(pluck(dd, "*[local-name()='PresentlyDelinquentIndicator']")));
        d.setAlimonyChildSupport(parseBool(pluck(dd, "*[local-name()='AlimonyChildSupportObligationIndicator']")));
        d.setBorrowingDownPayment(parseBool(pluck(dd, "*[local-name()='BorrowedDownPaymentIndicator']")));
        d.setComakerEndorser(parseBool(pluck(dd, "*[local-name()='CoMakerEndorserOfNoteIndicator']")));
        // Citizenship — flatten the MISMO type into our two booleans
        String citizen = pluck(dd, "*[local-name()='CitizenshipResidencyType']");
        if (citizen != null) {
            d.setUsCitizen("USCitizen".equalsIgnoreCase(citizen));
            d.setPermanentResident("PermanentResidentAlien".equalsIgnoreCase(citizen));
        }
        String intent = pluck(dd, "*[local-name()='IntentToOccupyType']");
        if (intent != null) {
            d.setIntentToOccupy("Yes".equalsIgnoreCase(intent));
        }
        changes.add(new FieldChange(prefix + "declaration", "<replaced>", "1 row"));
    }

    /**
     * Liabilities are wholesale-replaced on import — these come from LendingPad's credit pull
     * after the borrower submits, and represent the authoritative set. Borrowers don't curate
     * liabilities directly in the application form anyway.
     */
    private void applyLiabilities(Document doc, LoanApplication la, List<FieldChange> changes)
            throws XPathExpressionException {
        NodeList items = (NodeList) xp().evaluate(
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

    // ───────────────────────────────────────────────────────────────────────────
    // Parsing + utility helpers
    // ───────────────────────────────────────────────────────────────────────────

    private static Document parse(InputStream xml) throws ParserConfigurationException, IOException, org.xml.sax.SAXException {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        // Disable external entities (XXE protection)
        f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        f.setFeature("http://xml.org/sax/features/external-general-entities", false);
        f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        f.setNamespaceAware(true);
        DocumentBuilder b = f.newDocumentBuilder();
        return b.parse(new InputSource(xml));
    }

    private static XPath xp() {
        return XPathFactory.newInstance().newXPath();
    }

    private static LocalDateTime readCreatedDatetime(Document doc) throws XPathExpressionException {
        String dt = (String) xp().evaluate(
                "string(//*[local-name()='ABOUT_VERSION']/*[local-name()='CreatedDatetime'])", doc, XPathConstants.STRING);
        if (dt == null || dt.isBlank()) return null;
        try {
            return OffsetDateTime.parse(dt).toLocalDateTime();
        } catch (Exception e) {
            try { return LocalDateTime.parse(dt); } catch (Exception ee) { return null; }
        }
    }

    private static String textOf(Element parent, String childLocalName) {
        NodeList nl = parent.getChildNodes();
        for (int i = 0; i < nl.getLength(); i++) {
            Node n = nl.item(i);
            if (n.getNodeType() == Node.ELEMENT_NODE
                    && childLocalName.equals(n.getLocalName())) {
                String t = n.getTextContent();
                return t == null ? null : t.trim();
            }
        }
        return null;
    }

    private static String pluck(Object context, String xpath) throws XPathExpressionException {
        Object obj = xp().evaluate(xpath, context, XPathConstants.NODE);
        if (obj == null) return null;
        Node n = (Node) obj;
        String t = n.getTextContent();
        if (t == null) return null;
        String trimmed = t.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static Element first(Object context, String xpath) throws XPathExpressionException {
        Node n = (Node) xp().evaluate(xpath, context, XPathConstants.NODE);
        return (n instanceof Element) ? (Element) n : null;
    }

    private static String pluckTaxId(Element party, String type) throws XPathExpressionException {
        NodeList ids = (NodeList) xp().evaluate(
                ".//*[local-name()='TAXPAYER_IDENTIFIER']", party, XPathConstants.NODESET);
        for (int i = 0; i < ids.getLength(); i++) {
            Element e = (Element) ids.item(i);
            if (type.equals(textOf(e, "TaxpayerIdentifierType"))) {
                return textOf(e, "TaxpayerIdentifierValue");
            }
        }
        return null;
    }

    private static int parseSeq(Element party, int fallback) {
        String s = party.getAttribute("SequenceNumber");
        if (s == null || s.isBlank()) return fallback;
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return fallback; }
    }

    private static Borrower findBorrower(List<Borrower> existing, int seq, int posIndex) {
        for (Borrower b : existing) {
            if (b.getSequenceNumber() != null && b.getSequenceNumber() == seq) return b;
        }
        return posIndex < existing.size() ? existing.get(posIndex) : null;
    }

    private static BigDecimal parseDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try { return new BigDecimal(s); } catch (NumberFormatException e) { return null; }
    }

    /** Return the first non-null/non-blank string from the candidates. */
    private static String firstNonNull(String... candidates) {
        for (String c : candidates) {
            if (c != null && !c.isBlank()) return c;
        }
        return null;
    }

    /** MISMO indicators come through as "true"/"false" or "Y"/"N". */
    private static Boolean parseBool(String s) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        if (t.equalsIgnoreCase("true") || t.equalsIgnoreCase("yes") || t.equals("Y") || t.equals("1")) return true;
        if (t.equalsIgnoreCase("false") || t.equalsIgnoreCase("no") || t.equals("N") || t.equals("0")) return false;
        return null;
    }

    /**
     * Convert any phone-shaped string into the {@code 123-456-7890} format that
     * Employment.employerPhone and similar bean-validated fields require.
     *
     * <ul>
     *   <li>null / blank → null</li>
     *   <li>10 digits (any punctuation stripped) → reformatted with dashes</li>
     *   <li>11 digits starting with 1 (US country code) → drop the 1, reformat</li>
     *   <li>Already in canonical {@code 123-456-7890} → passed through</li>
     *   <li>Anything else → returned as-is so the validator can surface a real error
     *       instead of us silently swallowing data we don't understand</li>
     * </ul>
     */
    static String normalizePhone(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.matches("\\d{3}-\\d{3}-\\d{4}")) return trimmed;
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.length() == 11 && digits.startsWith("1")) digits = digits.substring(1);
        if (digits.length() == 10) {
            return digits.substring(0, 3) + "-" + digits.substring(3, 6) + "-" + digits.substring(6);
        }
        return trimmed;
    }

    /**
     * Convert a postal-code value to {@code 12345} or {@code 12345-6789} format.
     * 9 raw digits becomes the dashed ZIP+4 form; everything else passes through.
     */
    static String normalizeZip(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.matches("\\d{5}(-\\d{4})?")) return trimmed;
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.length() == 9) return digits.substring(0, 5) + "-" + digits.substring(5);
        if (digits.length() == 5) return digits;
        return trimmed;
    }

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
