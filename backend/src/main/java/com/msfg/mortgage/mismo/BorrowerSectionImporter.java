package com.msfg.mortgage.mismo;

import com.msfg.mortgage.model.Borrower;
import com.msfg.mortgage.model.Declaration;
import com.msfg.mortgage.model.Employment;
import com.msfg.mortgage.model.IncomeSource;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.model.REOProperty;
import com.msfg.mortgage.model.Residence;
import com.msfg.mortgage.mismo.parse.LinkContext;
import com.msfg.mortgage.mismo.parse.MismoXml;
import com.msfg.mortgage.repository.BorrowerRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static com.msfg.mortgage.mismo.parse.MismoCoerce.firstNonNull;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.normalizeMaritalStatus;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.normalizePhone;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.normalizeZip;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseBool;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseDecimal;
import static com.msfg.mortgage.mismo.parse.MismoNodes.first;
import static com.msfg.mortgage.mismo.parse.MismoNodes.parseSeq;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluck;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluckTaxId;

/**
 * Borrower-side of a MISMO 3.4 import — walks every {@code PARTY} that plays
 * a {@code Borrower} role and replaces the borrower's residences, employment,
 * income sources, REO properties, and declaration with what the XML carries.
 *
 * <p>Strategy:
 * <ul>
 *   <li>Match an incoming PARTY to an existing borrower by sequence number, or
 *       by position when sequence is absent. Creates a new {@code Borrower}
 *       row when no match is found, preserving prior borrowers' work.</li>
 *   <li>Each child collection (residences, employment, income, REO) is a
 *       wholesale replace — MISMO is the authoritative snapshot.</li>
 *   <li>Per-party assets are intentionally NOT applied here. LP uses the
 *       DEAL-level {@code ASSETS} layout with xlink routing, handled by the
 *       caller's {@code applyAssets} after every borrower exists with an ID.</li>
 * </ul>
 *
 * <p>Extracted from the 1101-line {@link MismoImporter} as part of audit
 * item CR-2. Behavior preserved; the orchestrator now delegates.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BorrowerSectionImporter {

    private final BorrowerRepository borrowerRepository;

    /**
     * Single entry point. Walks DEAL/PARTIES/PARTY for borrower-role parties
     * and reconciles each one's record.
     */
    public void apply(Document doc, LoanApplication la, LinkContext links,
                       List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        applyBorrowers(doc, la, links, changes);
    }

    // ── Borrowers ────────────────────────────────────────────────────────

    private void applyBorrowers(Document doc, LoanApplication la, LinkContext links,
                                  List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        // Walk PARTYs that play a Borrower-side role: primary Borrower, Cosigner, or
        // CoBorrower. (Skip PropertyOwner, LegalEntity for the LO, title companies, agents,
        // RealEstateAgent, etc.) LP exports a CoBorrower as PartyRoleType=Cosigner — without
        // accepting that value the second borrower is silently dropped on import.
        NodeList parties = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='PARTY']" +
                "[.//*[local-name()='ROLE_DETAIL']/*[local-name()='PartyRoleType']" +
                "[text()='Borrower' or text()='Cosigner' or text()='CoBorrower']]",
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
                changes.add(new MismoImporter.FieldChange("borrowers." + i, null, "<created>"));
            }

            String prefix = "borrowers." + i + ".";

            // Basic fields. Scope name lookups to INDIVIDUAL/NAME — a loose
            // ".//FirstName" would match the first ALIAS/NAME/FirstName in
            // document order (which for borrowers with AKAs would silently
            // overwrite the legal name with the alias).
            stringSet(b::getFirstName, b::setFirstName,
                    pluck(party, ".//*[local-name()='INDIVIDUAL']/*[local-name()='NAME']/*[local-name()='FirstName']"),
                    prefix + "firstName", changes);
            stringSet(b::getLastName, b::setLastName,
                    pluck(party, ".//*[local-name()='INDIVIDUAL']/*[local-name()='NAME']/*[local-name()='LastName']"),
                    prefix + "lastName", changes);

            String dob = pluck(party, ".//*[local-name()='BorrowerBirthDate']");
            if (dob != null) {
                try {
                    LocalDate newDob = LocalDate.parse(dob);
                    if (!Objects.equals(b.getBirthDate(), newDob)) {
                        changes.add(new MismoImporter.FieldChange(prefix + "birthDate",
                                String.valueOf(b.getBirthDate()), newDob.toString()));
                        b.setBirthDate(newDob);
                    }
                } catch (Exception ignored) { }
            }

            stringSet(b::getMaritalStatus, b::setMaritalStatus,
                    normalizeMaritalStatus(pluck(party, ".//*[local-name()='MaritalStatusType']")),
                    prefix + "maritalStatus", changes);
            stringSet(b::getCitizenshipType, b::setCitizenshipType,
                    pluck(party, ".//*[local-name()='CitizenshipResidencyType']"), prefix + "citizenshipType", changes);

            String dep = pluck(party, ".//*[local-name()='DependentCount']");
            if (dep != null) {
                try {
                    Integer newDep = Integer.valueOf(dep);
                    if (!Objects.equals(b.getDependentsCount(), newDep)) {
                        changes.add(new MismoImporter.FieldChange(prefix + "dependentsCount",
                                String.valueOf(b.getDependentsCount()), newDep.toString()));
                        b.setDependentsCount(newDep);
                    }
                } catch (NumberFormatException ignored) { }
            }

            // SSN
            String ssn = pluckTaxId(party, "SocialSecurityNumber");
            if (ssn != null) stringSet(b::getSsn, b::setSsn, ssn, prefix + "ssn", changes);

            // Email + phone. Phones in MISMO are role-tagged (Mobile/Home/Work);
            // prefer Mobile, then Home, then Work, then any.
            String email = pluck(party, ".//*[local-name()='ContactPointEmailValue']");
            if (email != null) stringSet(b::getEmail, b::setEmail, email, prefix + "email", changes);
            String phone = normalizePhone(pluckPreferredPhone(party));
            if (phone != null) stringSet(b::getPhone, b::setPhone, phone, prefix + "phone", changes);

            // ── Whole-list replace of child collections ─────────────────────────────
            replaceResidences(party, b, prefix, changes);
            replaceEmployment(party, b, links, prefix, changes);
            replaceIncomeSources(party, b, prefix, changes);
            // Assets handled at DEAL level — see MismoImporter.applyAssets.
            replaceReoProperties(party, b, prefix, changes);
            replaceDeclaration(party, b, prefix, changes);

            // Save: new borrowers need the parent FK to flush; existing get updated in-place.
            // Because LoanApplication.borrowers cascades ALL with orphanRemoval, the final
            // save on the LA at the controller layer would handle it — but persist now so
            // the borrower has an ID (needed for child FK setup on assets etc.).
            if (created) borrowerRepository.save(b);
        }
    }

    // ── Child-collection replacers ────────────────────────────────────────

    private void replaceResidences(Element party, Borrower b, String prefix,
                                     List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
                ".//*[local-name()='RESIDENCE']", party, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;
        if (b.getResidences() == null) b.setResidences(new ArrayList<>());
        b.getResidences().clear();
        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element r = (Element) nodes.item(i);
            String addr = pluck(r, ".//*[local-name()='AddressLineText']");
            String city = pluck(r, ".//*[local-name()='CityName']");
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
            changes.add(new MismoImporter.FieldChange(prefix + "residences", "<replaced>", kept + " row(s)"));
        }
    }

    private void replaceEmployment(Element party, Borrower b, LinkContext links, String prefix,
                                     List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
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
            // Monthly income: inline first, then fall back to a CURRENT_INCOME_ITEM linked
            // to this EMPLOYER via xlink. LP exports current employer income in the linked
            // CURRENT_INCOME_ITEM rather than inline on EMPLOYMENT.
            BigDecimal monthly = parseDecimal(pluck(e, ".//*[local-name()='EmploymentMonthlyIncomeAmount']"));
            if (monthly == null && links != null) {
                String employerLabel = e.getAttributeNS(LinkContext.XLINK_NS, "label");
                if (!employerLabel.isEmpty()) {
                    String incomeLabel = links.arcsByTo.get(employerLabel);
                    if (incomeLabel != null) {
                        Element incomeItem = links.elementsByLabel.get(incomeLabel);
                        if (incomeItem != null) {
                            monthly = parseDecimal(pluck(incomeItem,
                                    ".//*[local-name()='CurrentIncomeMonthlyTotalAmount']"));
                        }
                    }
                }
            }
            emp.setMonthlyIncome(monthly);
            String status = pluck(e, ".//*[local-name()='EmploymentStatusType']");
            emp.setEmploymentStatus(status);
            emp.setIsPresent(status != null && (status.equalsIgnoreCase("Current") || status.equalsIgnoreCase("Present")));
            String selfEmp = pluck(e, ".//*[local-name()='EmploymentBorrowerSelfEmployedIndicator']");
            emp.setSelfEmployed(selfEmp != null && Boolean.parseBoolean(selfEmp));
            b.getEmploymentHistory().add(emp);
            kept++;
        }
        if (kept > 0) {
            changes.add(new MismoImporter.FieldChange(prefix + "employmentHistory", "<replaced>", kept + " row(s)"));
        }
    }

    private void replaceIncomeSources(Element party, Borrower b, String prefix,
                                        List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        NodeList items = (NodeList) MismoXml.xp().evaluate(
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
            changes.add(new MismoImporter.FieldChange(prefix + "incomeSources", "<replaced>", rowCount + " row(s)"));
        }
    }

    private void replaceReoProperties(Element party, Borrower b, String prefix,
                                        List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
                ".//*[local-name()='OWNED_PROPERTY']", party, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;
        if (b.getReoProperties() == null) b.setReoProperties(new ArrayList<>());
        b.getReoProperties().clear();
        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element p = (Element) nodes.item(i);
            String addr = pluck(p, ".//*[local-name()='AddressLineText']");
            String city = pluck(p, ".//*[local-name()='CityName']");
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
            changes.add(new MismoImporter.FieldChange(prefix + "reoProperties", "<replaced>", kept + " row(s)"));
        }
    }

    private void replaceDeclaration(Element party, Borrower b, String prefix,
                                      List<MismoImporter.FieldChange> changes)
            throws XPathExpressionException {
        Element dd = first(party, ".//*[local-name()='DECLARATION_DETAIL']");
        // GOVERNMENT_MONITORING (HMDA) lives outside DECLARATION_DETAIL but per-PARTY.
        // We may have HMDA without declaration questions, or vice versa, so check both.
        Element gm = first(party, ".//*[local-name()='GOVERNMENT_MONITORING']");
        if (dd == null && gm == null) return;

        Declaration d = b.getDeclaration();
        if (d == null) {
            d = new Declaration();
            d.setBorrower(b);
            b.setDeclaration(d);
        }
        if (dd != null) {
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
        }

        if (gm != null) {
            applyHmda(gm, d);
        }
        changes.add(new MismoImporter.FieldChange(prefix + "declaration", "<replaced>", "1 row"));
    }

    /**
     * Pull HMDA government-monitoring values into the {@link Declaration}.
     *
     * <p>MISMO 3.4 carries multi-valued HMDA_RACES and HMDA_ETHNICITIES under
     * GOVERNMENT_MONITORING. We collapse each to a comma-separated list of MISMO
     * codes (the form/UI is responsible for rendering them as checkboxes).
     * HMDAGenderType lives in the ULAD: namespace; refusal indicators are
     * separate booleans we copy through verbatim.
     */
    private void applyHmda(Element gm, Declaration d) throws XPathExpressionException {
        // GOVERNMENT_MONITORING_DETAIL holds the refusal indicators
        Element detail = first(gm, ".//*[local-name()='GOVERNMENT_MONITORING_DETAIL']");
        if (detail != null) {
            Boolean ethRefusal = parseBool(pluck(detail, "*[local-name()='HMDAEthnicityRefusalIndicator']"));
            Boolean genderRefusal = parseBool(pluck(detail, "*[local-name()='HMDAGenderRefusalIndicator']"));
            Boolean raceRefusal = parseBool(pluck(detail, "*[local-name()='HMDARaceRefusalIndicator']"));
            if (ethRefusal != null)    d.setHmdaEthnicityRefusal(ethRefusal);
            if (genderRefusal != null) d.setHmdaSexRefusal(genderRefusal);
            if (raceRefusal != null)   d.setHmdaRaceRefusal(raceRefusal);
        }

        // Race: collect every HMDARaceType into a comma-separated list.
        String race = collectCsv(gm, ".//*[local-name()='HMDA_RACE']//*[local-name()='HMDARaceType']");
        if (race != null) d.setHmdaRace(race);

        // Ethnicity: collect every HMDAEthnicityType.
        String eth = collectCsv(gm, ".//*[local-name()='HMDA_ETHNICITY']//*[local-name()='HMDAEthnicityType']");
        if (eth != null) d.setHmdaEthnicity(eth);

        // Hispanic origin sub-types (Cuban, Mexican, etc.) when applicable.
        String origin = collectCsv(gm, ".//*[local-name()='HMDAEthnicityOriginType']");
        if (origin != null) d.setHmdaEthnicityOrigin(origin);

        // Gender — ULAD: namespace prefix; local-name() match handles it.
        String sex = pluck(gm, ".//*[local-name()='HMDAGenderType']");
        if (sex != null) d.setHmdaSex(sex);

        // ApplicationTakenMethodType lives under URLA, not here. We grab it
        // when present so each borrower's declaration carries the value
        // (form displays it once but having it on each row is harmless).
        Element party = (Element) gm.getParentNode();
        while (party != null && !"PARTY".equals(party.getLocalName())) party = (Element) party.getParentNode();
        if (party != null) {
            Element root = party.getOwnerDocument().getDocumentElement();
            String taken = pluck(root, ".//*[local-name()='ApplicationTakenMethodType']");
            if (taken != null) d.setApplicationTakenMethod(taken);
        }
    }

    /** Concatenate every text node matching the xpath into a comma-separated string. */
    private String collectCsv(Element ctx, String xpath) throws XPathExpressionException {
        NodeList list = (NodeList) MismoXml.xp().evaluate(xpath, ctx, XPathConstants.NODESET);
        if (list.getLength() == 0) return null;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < list.getLength(); i++) {
            String t = list.item(i).getTextContent();
            if (t == null) continue;
            t = t.trim();
            if (t.isEmpty()) continue;
            if (sb.length() > 0) sb.append(',');
            sb.append(t);
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Phone preference: Mobile → Home → Work → first available, regardless of role. */
    private String pluckPreferredPhone(Element party) throws XPathExpressionException {
        String[] roles = { "Mobile", "Home", "Work" };
        for (String role : roles) {
            String x = ".//*[local-name()='CONTACT_POINT']" +
                    "[.//*[local-name()='ContactPointRoleType' and text()='" + role + "']]" +
                    "//*[local-name()='ContactPointTelephoneValue']";
            String value = pluck(party, x);
            if (value != null) return value;
        }
        return pluck(party, ".//*[local-name()='ContactPointTelephoneValue']");
    }

    /** Match an incoming PARTY's sequence number to an existing borrower, or fall back to position. */
    static Borrower findBorrower(List<Borrower> existing, int seq, int posIndex) {
        for (Borrower b : existing) {
            if (b.getSequenceNumber() != null && b.getSequenceNumber() == seq) return b;
        }
        return posIndex < existing.size() ? existing.get(posIndex) : null;
    }

    /** Write a string field only when the new value is non-null AND differs from current. */
    private static void stringSet(java.util.function.Supplier<String> getter,
                                    java.util.function.Consumer<String> setter,
                                    String newVal, String path,
                                    List<MismoImporter.FieldChange> changes) {
        if (newVal == null) return;
        String old = getter.get();
        if (Objects.equals(old, newVal)) return;
        changes.add(new MismoImporter.FieldChange(path, old, newVal));
        setter.accept(newVal);
    }
}
