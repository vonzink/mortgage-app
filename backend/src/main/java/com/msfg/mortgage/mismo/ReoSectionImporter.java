package com.msfg.mortgage.mismo;

import com.msfg.mortgage.model.Borrower;
import com.msfg.mortgage.model.LoanApplication;
import com.msfg.mortgage.model.REOProperty;
import com.msfg.mortgage.mismo.parse.LinkContext;
import com.msfg.mortgage.mismo.parse.MismoXml;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.msfg.mortgage.mismo.parse.MismoCoerce.firstNonNull;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseDecimal;
import static com.msfg.mortgage.mismo.parse.MismoNodes.first;
import static com.msfg.mortgage.mismo.parse.MismoNodes.parseSeq;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluck;

/**
 * DEAL-level REO property import from MISMO 3.4 — LP puts REOs inside
 * {@code DEAL/ASSETS} as {@code ASSET[AssetType=RealEstateOwned]} with an
 * {@code OWNED_PROPERTY} child, NOT inside the borrower PARTY.
 *
 * <p>Extracted from {@link MismoImporter} as part of audit item CR-2.
 * Behavior preserved; the orchestrator now delegates.
 */
@Component
@Slf4j
public class ReoSectionImporter {

    /**
     * Single entry point. Applies DEAL-level REO assets to borrowers.
     */
    public void apply(Document doc, LoanApplication la, LinkContext links,
                      List<MismoImporter.FieldChange> changes) throws XPathExpressionException {
        applyReoFromAssets(doc, la, links, changes);
    }

    /**
     * REO properties — LP puts these inside DEAL/ASSETS as ASSET[AssetType=RealEstateOwned]
     * with an OWNED_PROPERTY child, NOT inside the borrower PARTY. That's why
     * BorrowerSectionImporter.replaceReoProperties (which scans within a party) never
     * finds anything in real LP exports.
     *
     * <p>Routing strategy mirrors {@link AssetSectionImporter#resolveAssetOwner}: xlink arc
     * from ASSET → ROLE → PARTY → match by sequence to a borrower; single-borrower fallback
     * otherwise.
     *
     * <p>Wholesale-replace per borrower on first incoming REO.
     */
    private void applyReoFromAssets(Document doc, LoanApplication la, LinkContext links,
                                     List<MismoImporter.FieldChange> changes) throws XPathExpressionException {
        NodeList nodes = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='ASSETS']/*[local-name()='ASSET']" +
                "[.//*[local-name()='AssetType' and text()='RealEstateOwned']]",
                doc, XPathConstants.NODESET);
        if (nodes.getLength() == 0) return;

        List<Borrower> borrowers = la.getBorrowers();
        if (borrowers == null || borrowers.isEmpty()) return;

        Map<Long, List<REOProperty>> bucket = new HashMap<>();
        for (Borrower b : borrowers) bucket.put(b.getId() == null ? -1L : b.getId(), new ArrayList<>());

        int kept = 0;
        for (int i = 0; i < nodes.getLength(); i++) {
            Element asset = (Element) nodes.item(i);
            Element owned = first(asset, ".//*[local-name()='OWNED_PROPERTY']");
            if (owned == null) continue;

            // Skip the subject property — it's already represented as the loan's Property
            String isSubject = pluck(owned,
                    ".//*[local-name()='OwnedPropertySubjectIndicator']");
            if ("true".equalsIgnoreCase(isSubject)) continue;

            Borrower owner = AssetSectionImporter.resolveAssetOwner(asset, links, borrowers);
            if (owner == null) {
                log.warn("MISMO REO ASSET could not be routed to a borrower; skipping. label={}",
                        asset.getAttributeNS(LinkContext.XLINK_NS, "label"));
                continue;
            }

            String addr = pluck(owned, ".//*[local-name()='AddressLineText']");
            String city = pluck(owned, ".//*[local-name()='CityName']");
            // reo_properties.address_line is NOT NULL — skip placeholder REO blocks
            // (LP emits PRIMARY-residence ASSET[RealEstateOwned] with only
            // PropertyEstimatedValueAmount and no ADDRESS). Carrying these as a
            // separate REO row would also be wrong: the borrower's primary IS
            // the subject property, not a separately-owned asset.
            if (addr == null && city == null) continue;

            REOProperty reo = new REOProperty();
            reo.setBorrower(owner);
            reo.setSequenceNumber(parseSeq(asset, i + 1));
            reo.setAddressLine(addr);
            reo.setCity(city);
            reo.setState(pluck(owned, ".//*[local-name()='StateCode']"));
            reo.setZipCode(pluck(owned, ".//*[local-name()='PostalCode']"));
            // PropertyUsageType / PropertyCurrentUsageType — keep raw MISMO value
            // (PrimaryResidence / SecondHome / Investment) so the UI can map it.
            reo.setPropertyType(firstNonNull(
                    pluck(owned, ".//*[local-name()='PropertyCurrentUsageType']"),
                    pluck(owned, ".//*[local-name()='PropertyUsageType']")));
            reo.setPropertyValue(parseDecimal(firstNonNull(
                    pluck(owned, ".//*[local-name()='PropertyValuationAmount']"),
                    pluck(owned, ".//*[local-name()='PropertyEstimatedValueAmount']"))));
            reo.setUnpaidBalance(parseDecimal(
                    pluck(owned, ".//*[local-name()='OwnedPropertyLienUPBAmount']")));
            reo.setMonthlyPayment(parseDecimal(
                    pluck(owned, ".//*[local-name()='OwnedPropertyMaintenanceExpenseAmount']")));
            // OwnedPropertyRentalIncomeNetAmount is NET (income minus expenses)
            // and CAN be negative (rental losing money). The form/entity treats
            // monthlyRentalIncome as gross income and forbids negatives via bean
            // validation, so clamp to zero — the loss side is already captured
            // by OwnedPropertyMaintenanceExpenseAmount above.
            BigDecimal netRent = parseDecimal(
                    pluck(owned, ".//*[local-name()='OwnedPropertyRentalIncomeNetAmount']"));
            if (netRent != null && netRent.signum() < 0) netRent = BigDecimal.ZERO;
            reo.setMonthlyRentalIncome(netRent);

            bucket.get(owner.getId() == null ? -1L : owner.getId()).add(reo);
            kept++;
        }

        // Replace strategy: only borrowers who got new REOs have their list reset.
        for (Borrower b : borrowers) {
            List<REOProperty> incoming = bucket.get(b.getId() == null ? -1L : b.getId());
            if (incoming.isEmpty()) continue;
            if (b.getReoProperties() == null) b.setReoProperties(new ArrayList<>());
            b.getReoProperties().clear();
            b.getReoProperties().addAll(incoming);
        }
        if (kept > 0) {
            changes.add(new MismoImporter.FieldChange("reoProperties", "<replaced>", kept + " row(s)"));
        }
    }
}
