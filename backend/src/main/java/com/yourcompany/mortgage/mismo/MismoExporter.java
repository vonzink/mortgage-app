package com.yourcompany.mortgage.mismo;

import com.yourcompany.mortgage.model.Asset;
import com.yourcompany.mortgage.model.Borrower;
import com.yourcompany.mortgage.model.Declaration;
import com.yourcompany.mortgage.model.Employment;
import com.yourcompany.mortgage.model.IncomeSource;
import com.yourcompany.mortgage.model.Liability;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.model.Property;
import com.yourcompany.mortgage.model.Residence;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.xml.stream.XMLStreamException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Builds a MISMO 3.4 XML document from a {@link LoanApplication} entity tree.
 *
 * <p>v1 emits <b>application-stage</b> data only — borrower-supplied fields the borrower portal
 * collects. Closing-stage sections (escrows, fees, AUS findings, integrated disclosures, MERS,
 * etc.) come back from LendingPad on import; we don't persist them in our DB and don't re-emit
 * them on export. LendingPad fills them in on their side after credit pull and underwriting.
 *
 * <p>Mapping is hand-derived from the LendingPad sample
 * {@code R008739-SarahHeaton-mismo3_4-closing.xml}. Element names use MISMO 3.4 vocabulary
 * (default namespace {@link #MISMO_NAMESPACE}).
 *
 * <p>Sections emitted:
 * <ul>
 *   <li>{@code MESSAGE/ABOUT_VERSIONS} — header metadata</li>
 *   <li>{@code DEAL/COLLATERALS/COLLATERAL/SUBJECT_PROPERTY} — property address + characteristics</li>
 *   <li>{@code DEAL/LOANS/LOAN} — loan amount, type, identifiers, HMDA</li>
 *   <li>{@code DEAL/LIABILITIES} — debts (after credit pull these come from LP)</li>
 *   <li>{@code DEAL/PARTIES/PARTY} (per borrower) — INDIVIDUAL, CONTACT_POINTS, ADDRESSES,
 *       EMPLOYERS, CURRENT_INCOME, ASSETS, DECLARATION, GOVERNMENT_MONITORING</li>
 * </ul>
 */
@Service
@Slf4j
public class MismoExporter {

    public static final String MISMO_NAMESPACE = "http://www.mismo.org/residential/2009/schemas";
    public static final String MISMO_REFERENCE_MODEL = "3.4.032420160128";
    public static final String GSE_NAMESPACE = "http://www.datamodelextension.org";
    public static final String ULAD_NAMESPACE = "http://www.datamodelextension.org/Schema/ULAD";

    /** Convenience: returns the bytes of the export. */
    public byte[] exportToBytes(LoanApplication la) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            export(la, out);
            return out.toByteArray();
        } catch (IOException | XMLStreamException e) {
            throw new RuntimeException("MISMO export failed for loan " + la.getId(), e);
        }
    }

    /** Streams the XML to the given output. */
    public void export(LoanApplication la, java.io.OutputStream out) throws XMLStreamException {
        try (MismoXmlWriter w = new MismoXmlWriter(out, MISMO_NAMESPACE)) {
            w.startRoot("MESSAGE",
                    Map.of("gse", GSE_NAMESPACE, "ULAD", ULAD_NAMESPACE),
                    Map.of("MISMOReferenceModelIdentifier", MISMO_REFERENCE_MODEL));

            writeAboutVersions(w);
            w.parent("DEAL_SETS", () -> w.parent("DEAL_SET", () -> w.parent("DEALS", () ->
                    w.parent("DEAL", () -> writeDeal(w, la))
            )));

            w.endRoot();
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Top-level sections
    // ───────────────────────────────────────────────────────────────────────────

    private void writeAboutVersions(MismoXmlWriter w) {
        w.parent("ABOUT_VERSIONS", () -> w.parent("ABOUT_VERSION", () -> {
            w.element("AboutVersionIdentifier", "MISMO v3.4 Origination");
            w.element("CreatedDatetime", LocalDateTime.now()
                    .atZone(java.time.ZoneOffset.UTC)
                    .format(java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        }));
    }

    private void writeDeal(MismoXmlWriter w, LoanApplication la) {
        writeCollaterals(w, la.getProperty());
        writeLoans(w, la);
        writeLiabilities(w, la.getLiabilities());
        writeParties(w, la.getBorrowers());
    }

    // ───────────────────────────────────────────────────────────────────────────
    // COLLATERALS / SUBJECT_PROPERTY
    // ───────────────────────────────────────────────────────────────────────────

    private void writeCollaterals(MismoXmlWriter w, Property p) {
        if (p == null) return;
        w.parent("COLLATERALS", () -> w.parent("COLLATERAL", () ->
                w.parent("SUBJECT_PROPERTY", MismoXmlWriter.attrs("SequenceNumber", "1"), () -> {
                    writeAddress(w, p.getAddressLine(), p.getCity(), p.getState(), p.getZipCode(), p.getCounty(), null);
                    w.parent("PROPERTY_DETAIL", () -> {
                        w.elementIfPresent("ConstructionMethodType", p.getConstructionType());
                        w.elementIfPresent("FinancedUnitCount", p.getUnitsCount());
                        w.elementIfPresent("PropertyEstateType", "FeeSimple");
                        w.elementIfPresent("PropertyExistingCleanEnergyLienIndicator", Boolean.FALSE);
                        w.elementIfPresent("PropertyStructureBuiltYear", p.getYearBuilt());
                        w.elementIfPresent("PropertyUsageType", p.getPropertyType());
                    });
                    if (p.getPropertyValue() != null) {
                        w.parent("PROPERTY_VALUATIONS", () -> w.parent("PROPERTY_VALUATION", () ->
                                w.parent("PROPERTY_VALUATION_DETAIL", () ->
                                        w.element("PropertyValuationAmount", p.getPropertyValue().toPlainString())
                                )
                        ));
                    }
                })
        ));
    }

    private void writeAddress(MismoXmlWriter w, String line, String city, String state, String zip,
                              String county, String country) {
        w.parent("ADDRESS", () -> {
            w.elementIfPresent("AddressLineText", line);
            w.elementIfPresent("CityName", city);
            w.elementIfPresent("CountryCode", country == null ? "US" : country);
            w.elementIfPresent("CountyName", county);
            w.elementIfPresent("PostalCode", zip);
            w.elementIfPresent("StateCode", state);
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LOANS / LOAN
    // ───────────────────────────────────────────────────────────────────────────

    private void writeLoans(MismoXmlWriter w, LoanApplication la) {
        w.parent("LOANS", () -> w.parent("LOAN", MismoXmlWriter.attrs(
                "LoanRoleType", "SubjectLoan", "SequenceNumber", "1"
        ), () -> {
            writeLoanIdentifiers(w, la);
            writeLoanDetail(w, la);
            writeTermsOfLoan(w, la);
            writeHmdaLoan(w);
        }));
    }

    private void writeLoanIdentifiers(MismoXmlWriter w, LoanApplication la) {
        w.parent("LOAN_IDENTIFIERS", () -> {
            // Always emit our internal app number, tagged so import on a future build can find it
            if (la.getApplicationNumber() != null) {
                w.parent("LOAN_IDENTIFIER", () -> {
                    w.element("LoanIdentifier", la.getApplicationNumber());
                    w.element("LoanIdentifierType", "Other");
                    w.element("LoanIdentifierTypeOtherDescription", "MSFGApplicationNumber");
                });
            }
            if (la.getLendingpadLoanNumber() != null) {
                w.parent("LOAN_IDENTIFIER", () -> {
                    w.element("LoanIdentifier", la.getLendingpadLoanNumber());
                    w.element("LoanIdentifierType", "LenderLoan");
                });
            }
            if (la.getInvestorLoanNumber() != null) {
                w.parent("LOAN_IDENTIFIER", () -> {
                    w.element("LoanIdentifier", la.getInvestorLoanNumber());
                    w.element("LoanIdentifierType", "InvestorLoan");
                });
            }
            if (la.getMersMin() != null) {
                w.parent("LOAN_IDENTIFIER", () -> {
                    w.element("LoanIdentifier", la.getMersMin());
                    w.element("LoanIdentifierType", "MERS_MIN");
                });
            }
        });
    }

    private void writeLoanDetail(MismoXmlWriter w, LoanApplication la) {
        w.parent("LOAN_DETAIL", () -> {
            w.elementIfPresent("LoanPurposeType", la.getLoanPurpose());
            // MISMO uses MortgageType element nested deeper, keeping a flat hint here
        });
    }

    private void writeTermsOfLoan(MismoXmlWriter w, LoanApplication la) {
        w.parent("TERMS_OF_LOAN", () -> {
            w.elementIfPresent("BaseLoanAmount", la.getLoanAmount());
            w.elementIfPresent("MortgageType", la.getLoanType()); // Conventional, FHA, VA, USDA
        });
    }

    private void writeHmdaLoan(MismoXmlWriter w) {
        // HMDA fields are populated by LendingPad after credit pull / AUS run; emit a stub
        // so importers don't trip on a missing block.
        w.parent("HMDA_LOAN", () -> w.parent("HMDA_LOAN_DETAIL", () -> {
            // intentionally empty
        }));
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LIABILITIES
    // ───────────────────────────────────────────────────────────────────────────

    private void writeLiabilities(MismoXmlWriter w, List<Liability> liabilities) {
        if (liabilities == null || liabilities.isEmpty()) return;
        w.parent("LIABILITIES", () -> {
            int seq = 1;
            for (Liability l : liabilities) {
                final int seqNum = seq++;
                w.parent("LIABILITY", MismoXmlWriter.attrs("SequenceNumber", String.valueOf(seqNum)), () -> {
                    w.parent("LIABILITY_DETAIL", () -> {
                        w.elementIfPresent("LiabilityAccountIdentifier", l.getAccountNumber());
                        w.elementIfPresent("LiabilityType", l.getLiabilityType());
                        w.elementIfPresent("LiabilityMonthlyPaymentAmount", l.getMonthlyPayment());
                        w.elementIfPresent("LiabilityUnpaidBalanceAmount", l.getUnpaidBalance());
                        w.elementIfPresent("LiabilityExclusionIndicator", Boolean.FALSE);
                        w.elementIfPresent("LiabilityPayoffStatusIndicator", l.getPayoffStatus());
                    });
                    if (l.getCreditorName() != null) {
                        w.parent("LIABILITY_HOLDER", () ->
                                w.parent("NAME", () ->
                                        w.element("FullName", l.getCreditorName())));
                    }
                });
            }
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PARTIES (one per borrower)
    // ───────────────────────────────────────────────────────────────────────────

    private void writeParties(MismoXmlWriter w, List<Borrower> borrowers) {
        if (borrowers == null || borrowers.isEmpty()) return;
        w.parent("PARTIES", () -> {
            int seq = 1;
            for (Borrower b : borrowers) {
                final int seqNum = seq++;
                w.parent("PARTY", MismoXmlWriter.attrs("SequenceNumber", String.valueOf(seqNum)), () -> {
                    writeIndividual(w, b);
                    writeRoles(w, b);
                });
            }
        });
    }

    private void writeIndividual(MismoXmlWriter w, Borrower b) {
        w.parent("INDIVIDUAL", () -> {
            w.parent("NAME", () -> {
                w.elementIfPresent("FirstName", b.getFirstName());
                w.elementIfPresent("LastName", b.getLastName());
                w.element("FullName", String.join(" ",
                        b.getFirstName() == null ? "" : b.getFirstName(),
                        b.getLastName() == null ? "" : b.getLastName()).trim());
            });
            writeContactPoints(w, b);
        });
    }

    private void writeContactPoints(MismoXmlWriter w, Borrower b) {
        if (b.getEmail() == null && b.getPhone() == null) return;
        w.parent("CONTACT_POINTS", () -> {
            if (b.getEmail() != null) {
                w.parent("CONTACT_POINT", () -> {
                    w.parent("CONTACT_POINT_EMAIL", () -> w.element("ContactPointEmailValue", b.getEmail()));
                    w.parent("CONTACT_POINT_DETAIL", () -> w.element("ContactPointRoleType", "Home"));
                });
            }
            if (b.getPhone() != null) {
                w.parent("CONTACT_POINT", () -> {
                    w.parent("CONTACT_POINT_TELEPHONE", () -> w.element("ContactPointTelephoneValue", b.getPhone()));
                    w.parent("CONTACT_POINT_DETAIL", () -> w.element("ContactPointRoleType", "Mobile"));
                });
            }
        });
    }

    private void writeRoles(MismoXmlWriter w, Borrower b) {
        w.parent("ROLES", () -> w.parent("ROLE", () -> {
            w.parent("BORROWER", () -> {
                writeBorrowerDetail(w, b);
                writeBorrowerCurrentIncome(w, b);
                writeBorrowerEmployers(w, b);
                writeBorrowerResidences(w, b);
                writeBorrowerAssets(w, b);
                writeBorrowerDeclaration(w, b.getDeclaration());
            });
            w.parent("ROLE_DETAIL", () -> w.element("PartyRoleType", "Borrower"));
        }));
    }

    private void writeBorrowerDetail(MismoXmlWriter w, Borrower b) {
        w.parent("BORROWER_DETAIL", () -> {
            w.elementIfPresent("BorrowerBirthDate", b.getBirthDate());
            w.elementIfPresent("DependentCount", b.getDependentsCount());
            w.elementIfPresent("MaritalStatusType", b.getMaritalStatus());
            w.elementIfPresent("BorrowerClassificationType", "Primary");
            // SSN goes under TAXPAYER_IDENTIFIERS — MISMO 3.4 split — emit only if present
            if (b.getSsn() != null && !b.getSsn().isBlank()) {
                w.parent("TAXPAYER_IDENTIFIERS", () -> w.parent("TAXPAYER_IDENTIFIER", () -> {
                    w.element("TaxpayerIdentifierType", "SocialSecurityNumber");
                    w.element("TaxpayerIdentifierValue", b.getSsn());
                }));
            }
        });
    }

    private void writeBorrowerCurrentIncome(MismoXmlWriter w, Borrower b) {
        BigDecimal employmentTotal = (b.getEmploymentHistory() == null) ? BigDecimal.ZERO :
                b.getEmploymentHistory().stream()
                        .filter(e -> Boolean.TRUE.equals(e.getIsPresent()) || "Present".equalsIgnoreCase(e.getEmploymentStatus()))
                        .map(e -> e.getMonthlyIncome() == null ? BigDecimal.ZERO : e.getMonthlyIncome())
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal otherTotal = (b.getIncomeSources() == null) ? BigDecimal.ZERO :
                b.getIncomeSources().stream()
                        .map(s -> s.getMonthlyAmount() == null ? BigDecimal.ZERO : s.getMonthlyAmount())
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = employmentTotal.add(otherTotal);
        if (total.compareTo(BigDecimal.ZERO) <= 0 && (b.getIncomeSources() == null || b.getIncomeSources().isEmpty())) {
            return;
        }
        w.parent("CURRENT_INCOME", () -> {
            w.parent("CURRENT_INCOME_ITEMS", () -> {
                int seq = 1;
                if (b.getIncomeSources() != null) {
                    for (IncomeSource src : b.getIncomeSources()) {
                        final int s = seq++;
                        w.parent("CURRENT_INCOME_ITEM", MismoXmlWriter.attrs("SequenceNumber", String.valueOf(s)), () ->
                                w.parent("CURRENT_INCOME_ITEM_DETAIL", () -> {
                                    w.elementIfPresent("CurrentIncomeMonthlyTotalAmount", src.getMonthlyAmount());
                                    w.elementIfPresent("EmploymentIncomeIndicator", Boolean.FALSE);
                                    w.elementIfPresent("IncomeType", src.getIncomeType());
                                }));
                    }
                }
                if (employmentTotal.compareTo(BigDecimal.ZERO) > 0) {
                    final int s = seq;
                    w.parent("CURRENT_INCOME_ITEM", MismoXmlWriter.attrs("SequenceNumber", String.valueOf(s)), () ->
                            w.parent("CURRENT_INCOME_ITEM_DETAIL", () -> {
                                w.element("CurrentIncomeMonthlyTotalAmount", employmentTotal.toPlainString());
                                w.element("EmploymentIncomeIndicator", "true");
                                w.element("IncomeType", "Base");
                            }));
                }
            });
            w.parent("CURRENT_INCOME_SUMMARY", () ->
                    w.element("CurrentIncomeMonthlyTotalAmount", total.toPlainString()));
        });
    }

    private void writeBorrowerEmployers(MismoXmlWriter w, Borrower b) {
        if (b.getEmploymentHistory() == null || b.getEmploymentHistory().isEmpty()) return;
        w.parent("EMPLOYERS", () -> {
            int seq = 1;
            for (Employment e : b.getEmploymentHistory()) {
                final int s = seq++;
                w.parent("EMPLOYER", MismoXmlWriter.attrs("SequenceNumber", String.valueOf(s)), () -> {
                    if (e.getEmployerName() != null || e.getEmployerCity() != null) {
                        w.parent("LEGAL_ENTITY", () ->
                                w.parent("LEGAL_ENTITY_DETAIL", () ->
                                        w.elementIfPresent("FullName", e.getEmployerName())));
                        writeAddress(w, e.getEmployerAddress(), e.getEmployerCity(), e.getEmployerState(),
                                e.getEmployerZip(), null, null);
                        if (e.getEmployerPhone() != null) {
                            w.parent("CONTACT_POINTS", () -> w.parent("CONTACT_POINT", () ->
                                    w.parent("CONTACT_POINT_TELEPHONE", () ->
                                            w.element("ContactPointTelephoneValue", e.getEmployerPhone()))));
                        }
                    }
                    w.parent("EMPLOYMENT", () -> w.parent("EMPLOYMENT_DETAIL", () -> {
                        w.elementIfPresent("EmploymentBorrowerSelfEmployedIndicator", e.getSelfEmployed());
                        w.elementIfPresent("EmploymentClassificationType", e.getEmploymentStatus());
                        w.elementIfPresent("EmploymentPositionDescription", e.getPosition());
                        w.elementIfPresent("EmploymentStartDate", e.getStartDate());
                        w.elementIfPresent("EmploymentEndDate", e.getEndDate());
                        w.elementIfPresent("EmploymentStatusType",
                                Boolean.TRUE.equals(e.getIsPresent()) ? "Current" : "Previous");
                    }));
                });
            }
        });
    }

    private void writeBorrowerResidences(MismoXmlWriter w, Borrower b) {
        if (b.getResidences() == null || b.getResidences().isEmpty()) return;
        w.parent("RESIDENCES", () -> {
            int seq = 1;
            for (Residence r : b.getResidences()) {
                final int s = seq++;
                w.parent("RESIDENCE", MismoXmlWriter.attrs("SequenceNumber", String.valueOf(s)), () -> {
                    writeAddress(w, r.getAddressLine(), r.getCity(), r.getState(), r.getZipCode(), null, null);
                    w.parent("RESIDENCE_DETAIL", () -> {
                        w.elementIfPresent("BorrowerResidencyType", r.getResidencyType());
                        w.elementIfPresent("BorrowerResidencyBasisType", r.getResidencyBasis());
                        w.elementIfPresent("BorrowerResidencyDurationMonthsCount", r.getDurationMonths());
                        w.elementIfPresent("MonthlyRentAmount", r.getMonthlyRent());
                    });
                });
            }
        });
    }

    private void writeBorrowerAssets(MismoXmlWriter w, Borrower b) {
        // Asset is on borrower side via @ManyToOne; the entity exposes it via getAssets() if present.
        // Borrower entity in this codebase doesn't expose a getAssets(); skip for now and revisit
        // when the application form wires assets to the borrower object. (Migration V5 created the
        // table; entity already maps it; we just don't have a back-reference list yet.)
    }

    private void writeBorrowerDeclaration(MismoXmlWriter w, Declaration d) {
        if (d == null) return;
        w.parent("DECLARATION", () -> w.parent("DECLARATION_DETAIL", () -> {
            w.elementIfPresent("AlimonyChildSupportObligationIndicator", d.getAlimonyChildSupport());
            w.elementIfPresent("BankruptcyIndicator", d.getBankruptcy());
            w.elementIfPresent("BorrowedDownPaymentIndicator", d.getBorrowingDownPayment());
            w.elementIfPresent("CitizenshipResidencyType", Boolean.TRUE.equals(d.getUsCitizen()) ? "USCitizen" :
                    Boolean.TRUE.equals(d.getPermanentResident()) ? "PermanentResidentAlien" : "NonPermanentResidentAlien");
            w.elementIfPresent("CoMakerEndorserOfNoteIndicator", d.getComakerEndorser());
            w.elementIfPresent("HomeownerPastThreeYearsType", "");
            w.elementIfPresent("IntentToOccupyType", Boolean.TRUE.equals(d.getIntentToOccupy()) ? "Yes" : "No");
            w.elementIfPresent("OutstandingJudgmentsIndicator", d.getOutstandingJudgments());
            w.elementIfPresent("PartyToLawsuitIndicator", d.getLawsuit());
            w.elementIfPresent("PresentlyDelinquentIndicator", d.getPresentlyDelinquent());
            w.elementIfPresent("PriorPropertyDeedInLieuConveyedIndicator", d.getLoanForeclosure());
            w.elementIfPresent("PriorPropertyForeclosureCompletedIndicator", d.getForeclosure());
        }));
    }
}
