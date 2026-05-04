package com.yourcompany.mortgage.mismo;

import com.yourcompany.mortgage.model.*;
import org.springframework.stereotype.Service;

import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

/**
 * Generates MISMO 3.4 XML for a {@link LoanApplication}.
 *
 * Two variants:
 *   - {@link Variant#CLOSING} — minimal closing-stage shape (loan, parties, incomes, collateral, liabilities)
 *   - {@link Variant#FNM} — Fannie-Mae-flavored shape with assets, expanded loan detail,
 *     down payments, full borrower DECLARATION block, residences, and per-employer addresses.
 *
 * Output matches what {@code frontend/src/utils/urlaExport.js} previously generated in the
 * browser. Migrating to the backend keeps PII out of client-side memory and gives us one
 * place to validate against a real LP / FNM XSD if/when that's procured.
 *
 * StAX is used for streaming output and proper XML escaping.
 */
@Service
public class MismoExporter {

    public enum Variant { CLOSING, FNM }

    private static final String NS_MISMO = "http://www.mismo.org/residential/2009/schemas";
    private static final String NS_XSI = "http://www.w3.org/2001/XMLSchema-instance";
    private static final String NS_FNM = "http://www.fanniemae.com/loandelivery/schemas";

    private final XMLOutputFactory factory = XMLOutputFactory.newFactory();

    public byte[] export(LoanApplication application, Variant variant) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream(8192);
        try {
            XMLStreamWriter raw = factory.createXMLStreamWriter(baos, "UTF-8");
            MismoXmlWriter w = new MismoXmlWriter(raw);

            w.document();
            w.start("MESSAGE");
            w.defaultNamespace(NS_MISMO);
            w.namespace("xsi", NS_XSI);
            if (variant == Variant.FNM) w.namespace("fnm", NS_FNM);
            w.attr("MISMOVersionID", "3.4");

            writeAboutVersions(w);

            w.start("DEAL_SETS");
            w.start("DEAL_SET");
            w.start("DEALS");
            w.start("DEAL");

            if (variant == Variant.FNM) {
                writeAssets(w, application);
            }

            writeLoans(w, application, variant);
            writeCollaterals(w, application, variant);
            writeLiabilities(w, application);

            w.end(); // DEAL
            w.end(); // DEALS
            w.end(); // DEAL_SET
            w.end(); // DEAL_SETS

            w.end(); // MESSAGE
            w.endDocument();
            raw.flush();
            raw.close();
        } catch (XMLStreamException e) {
            throw new IOException("Failed to write MISMO XML", e);
        }
        return baos.toByteArray();
    }

    public String suggestedFilename(LoanApplication application, Variant variant) {
        String number = application.getApplicationNumber() != null ? application.getApplicationNumber() : "PENDING";
        String label = variant == Variant.FNM ? "FNM" : "Closing";
        return String.format("MISMO-3.4-%s-%s-%d.xml", label, number, System.currentTimeMillis());
    }

    // -- sections --

    private void writeAboutVersions(MismoXmlWriter w) throws XMLStreamException {
        w.start("ABOUT_VERSIONS");
        w.start("ABOUT_VERSION");
        w.simple("CreatedDatetime", Instant.now().toString());
        w.simple("DataVersionIdentifier", "1");
        w.end();
        w.end();
    }

    private void writeAssets(MismoXmlWriter w, LoanApplication app) throws XMLStreamException {
        w.start("ASSETS");
        for (Borrower b : safe(app.getBorrowers())) {
            for (Asset asset : safe(b.getAssets())) {
                w.start("ASSET");
                w.start("ASSET_DETAIL");
                w.simple("AssetAccountIdentifier", asset.getAccountNumber());
                w.simple("AssetCashOrMarketValueAmount", asset.getAssetValue());
                w.simple("AssetType", asset.getAssetType());
                w.end();
                w.start("ASSET_HOLDER");
                w.start("NAME");
                w.simple("FullName", asset.getBankName());
                w.end();
                w.end();
                w.end();
            }
        }
        w.end();
    }

    private void writeLoans(MismoXmlWriter w, LoanApplication app, Variant variant) throws XMLStreamException {
        w.start("LOANS");
        w.start("LOAN");

        w.start("LOAN_IDENTIFIERS");
        w.start("LOAN_IDENTIFIER");
        w.simple("LoanIdentifier", app.getApplicationNumber() != null ? app.getApplicationNumber() : "PENDING");
        w.simple("LoanIdentifierType", "LenderLoan");
        w.end();
        w.end();

        w.start("LOAN_DETAIL");
        if (variant == Variant.FNM) {
            w.simple("ApplicationReceivedDate", LocalDate.now().toString());
            w.bool("BalloonIndicator", false);
            w.bool("BuydownTemporarySubsidyFundingIndicator", false);
            w.bool("ConstructionLoanIndicator", false);
            w.bool("ConversionOfContractForDeedIndicator", false);
            w.bool("InterestOnlyIndicator", false);
            w.bool("NegativeAmortizationIndicator", false);
            w.bool("PrepaymentPenaltyIndicator", false);
        }
        w.simple("LoanPurposeType", app.getLoanPurpose());
        w.simple("MortgageType", app.getLoanType());
        w.simple("LoanAmount", app.getLoanAmount());
        w.end();

        if (variant == Variant.FNM) {
            w.start("DOWN_PAYMENTS");
            w.start("DOWN_PAYMENT");
            w.simple("DownPaymentAmount", "0"); // TODO: derive from app once down-payment is modeled
            w.simple("DownPaymentType", "OtherTypeSeeRemarks");
            w.end();
            w.end();
        }

        writeParties(w, app, variant);
        writeQualification(w, app, variant);

        w.end(); // LOAN
        w.end(); // LOANS
    }

    private void writeParties(MismoXmlWriter w, LoanApplication app, Variant variant) throws XMLStreamException {
        w.start("PARTIES");
        int index = 0;
        for (Borrower b : safe(app.getBorrowers())) {
            index++;
            w.start("PARTY");

            w.start("INDIVIDUAL");
            w.start("NAME");
            w.simple("FirstName", b.getFirstName());
            w.simple("MiddleName", "");
            w.simple("LastName", b.getLastName());
            w.end();
            w.start("CONTACT_POINTS");
            w.start("CONTACT_POINT");
            w.start("CONTACT_POINT_EMAIL");
            w.simple("ContactPointEmailValue", b.getEmail());
            w.end();
            w.start("CONTACT_POINT_TELEPHONE");
            w.simple("ContactPointTelephoneValue", b.getPhone());
            w.end();
            w.end();
            w.end();
            w.end(); // INDIVIDUAL

            w.start("ROLES");
            w.start("ROLE");
            w.start("ROLE_DETAIL");
            w.simple("PartyRoleType", "Borrower");
            w.simple("PartyRoleSequenceNumber", index);
            w.end();
            w.start("BORROWER");

            if (variant == Variant.FNM) {
                w.start("BORROWER_DETAIL");
                w.simple("BorrowerBirthDate", b.getBirthDate());
                w.simple("BorrowerClassificationType", index == 1 ? "Primary" : "Secondary");
                w.simple("DependentCount", b.getDependentsCount() == null ? "0" : String.valueOf(b.getDependentsCount()));
                w.simple("MaritalStatusType", b.getMaritalStatus());
                w.simple("TaxpayerIdentifierValue", b.getSsn());
                w.end();
                writeFnmDeclaration(w, b);
                writeResidences(w, b);
            } else {
                w.start("DECLARATION");
                Declaration d = b.getDeclaration();
                w.bool("DeclarationIndicator", d != null && Boolean.TRUE.equals(d.getIntentToOccupy()));
                w.end();
                w.start("GOVERNMENT_MONITORING");
                w.simple("HMDAEthnicityType", "NotProvided");
                w.end();
            }

            w.end(); // BORROWER
            w.end(); // ROLE
            w.end(); // ROLES
            w.end(); // PARTY
        }
        w.end();
    }

    private void writeFnmDeclaration(MismoXmlWriter w, Borrower b) throws XMLStreamException {
        Declaration d = b.getDeclaration();
        boolean usCitizen = Boolean.TRUE.equals(b.getCitizenshipType() != null
                && b.getCitizenshipType().equalsIgnoreCase("USCitizen") ? true : null);
        boolean permanentResident = Boolean.TRUE.equals(b.getCitizenshipType() != null
                && b.getCitizenshipType().equalsIgnoreCase("PermanentResident") ? true : null);

        w.start("DECLARATION");
        w.bool("BankruptcyIndicator", d != null && Boolean.TRUE.equals(d.getBankruptcy()));
        w.simple("CitizenshipResidencyType",
                usCitizen ? "USCitizen" :
                        permanentResident ? "PermanentResidentAlien" : "NonPermanentResidentAlien");
        w.bool("CoMakerEndorserOfNoteIndicator", d != null && Boolean.TRUE.equals(d.getComakerEndorser()));
        w.simple("HomeownerPastThreeYearsType", "No");
        w.bool("IntentToOccupyIndicator", d != null && Boolean.TRUE.equals(d.getIntentToOccupy()));
        w.bool("LoanForeclosureOrJudgmentIndicator", d != null && Boolean.TRUE.equals(d.getForeclosure()));
        w.bool("OutstandingJudgmentsIndicator", d != null && Boolean.TRUE.equals(d.getOutstandingJudgments()));
        w.bool("PartyToLawsuitIndicator", d != null && Boolean.TRUE.equals(d.getLawsuit()));
        w.bool("PresentlyDelinquentIndicator", d != null && Boolean.TRUE.equals(d.getPresentlyDelinquent()));
        w.simple("PriorPropertyUsageType", "Investment");
        w.bool("PropertyProposedCleanEnergyLienIndicator", false);
        w.end();
    }

    private void writeResidences(MismoXmlWriter w, Borrower b) throws XMLStreamException {
        w.start("RESIDENCES");
        for (Residence res : safe(b.getResidences())) {
            w.start("RESIDENCE");
            w.start("ADDRESS");
            w.simple("AddressLineText", res.getAddressLine());
            w.simple("CityName", res.getCity());
            w.simple("StateCode", res.getState());
            w.simple("PostalCode", res.getZipCode());
            w.end();
            w.start("RESIDENCE_DETAIL");
            w.simple("BorrowerResidencyBasisType", res.getResidencyBasis());
            w.simple("BorrowerResidencyDurationMonthsCount",
                    res.getDurationMonths() == null ? "0" : String.valueOf(res.getDurationMonths()));
            w.simple("BorrowerResidencyType", res.getResidencyType());
            w.end();
            w.end();
        }
        w.end();
    }

    private void writeQualification(MismoXmlWriter w, LoanApplication app, Variant variant) throws XMLStreamException {
        w.start("QUALIFICATION");
        w.start("INCOMES");
        for (Borrower b : safe(app.getBorrowers())) {
            for (Employment emp : safe(b.getEmploymentHistory())) {
                w.start("INCOME");
                w.simple("IncomeMonthlyTotalAmount", emp.getMonthlyIncome());
                w.simple("IncomeType", "Employment");
                w.start("EMPLOYERS");
                w.start("EMPLOYER");
                w.simple("EmployerName", emp.getEmployerName());
                if (variant == Variant.FNM) {
                    w.start("ADDRESS");
                    w.simple("AddressLineText", emp.getEmployerAddress());
                    w.end();
                }
                w.start("EMPLOYMENT");
                w.simple("EmploymentPositionDescription", emp.getPosition());
                w.simple("EmploymentStartDate", emp.getStartDate());
                w.simple("EmploymentEndDate", emp.getEndDate());
                w.simple("EmploymentClassificationType",
                        Boolean.TRUE.equals(emp.getSelfEmployed()) ? "SelfEmployed" : "Primary");
                if (variant == Variant.FNM) {
                    w.simple("EmploymentMonthlyIncomeAmount", emp.getMonthlyIncome());
                }
                w.end();
                w.end();
                w.end();
                w.end();
            }
        }
        w.end();
        w.end();
    }

    private void writeCollaterals(MismoXmlWriter w, LoanApplication app, Variant variant) throws XMLStreamException {
        w.start("COLLATERALS");
        w.start("COLLATERAL");
        w.start("SUBJECT_PROPERTY");

        Property p = app.getProperty();
        w.start("ADDRESS");
        w.simple("AddressLineText", p == null ? "" : p.getAddressLine());
        w.simple("CityName", p == null ? "" : p.getCity());
        w.simple("StateCode", p == null ? "" : p.getState());
        w.simple("PostalCode", p == null ? "" : p.getZipCode());
        w.end();

        w.start("PROPERTY_DETAIL");
        w.simple("PropertyEstimatedValueAmount", p == null ? "0" : String.valueOf(p.getPropertyValue()));
        w.bool("PropertyExistingCleanEnergyLienIndicator", false);
        w.bool("PropertyInProjectIndicator", false);
        w.simple("PropertyUsageType", p == null ? "" : p.getPropertyType());
        w.simple("AttachmentType", p == null ? "" : p.getPropertyType());
        w.simple("PropertyBuiltYear", p == null ? "" : String.valueOf(p.getYearBuilt()));
        w.simple("PropertyEstateType", "FeeSimple");
        if (variant == Variant.FNM) {
            w.simple("FinancedUnitCount", p == null || p.getUnitsCount() == null ? "1" : String.valueOf(p.getUnitsCount()));
        }
        w.end();
        w.end();
        w.end();
        w.end();
    }

    private void writeLiabilities(MismoXmlWriter w, LoanApplication app) throws XMLStreamException {
        w.start("LIABILITIES");
        for (Liability liability : safe(app.getLiabilities())) {
            w.start("LIABILITY");
            w.start("LIABILITY_DETAIL");
            w.simple("LiabilityAccountIdentifier", liability.getAccountNumber());
            w.simple("LiabilityMonthlyPaymentAmount", liability.getMonthlyPayment());
            w.bool("LiabilityPayoffStatusIndicator", false);
            w.simple("LiabilityType", liability.getLiabilityType());
            w.simple("LiabilityUnpaidBalanceAmount", liability.getUnpaidBalance());
            w.end();
            w.start("LIABILITY_HOLDER");
            w.start("NAME");
            w.simple("FullName", liability.getCreditorName());
            w.end();
            w.end();
            w.end();
        }
        w.end();
    }

    private static <T> List<T> safe(List<T> in) {
        return in == null ? Collections.emptyList() : in;
    }

    public byte[] export(LoanApplication application, String variant) throws IOException {
        Variant v = "fnm".equalsIgnoreCase(variant) ? Variant.FNM : Variant.CLOSING;
        return export(application, v);
    }

    public String suggestedFilename(LoanApplication application, String variant) {
        Variant v = "fnm".equalsIgnoreCase(variant) ? Variant.FNM : Variant.CLOSING;
        return suggestedFilename(application, v);
    }
}
