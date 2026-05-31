package com.msfg.mortgage.mismo;

import com.msfg.mortgage.model.Asset;
import com.msfg.mortgage.model.Borrower;
import com.msfg.mortgage.model.LoanApplication;
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

import static com.msfg.mortgage.mismo.parse.MismoCoerce.normalizeAssetType;
import static com.msfg.mortgage.mismo.parse.MismoCoerce.parseDecimal;
import static com.msfg.mortgage.mismo.parse.MismoNodes.parseSeq;
import static com.msfg.mortgage.mismo.parse.MismoNodes.pluck;

/**
 * DEAL-level asset import from MISMO 3.4 — walks {@code ASSETS/ASSET} elements
 * and routes each to its owning borrower via xlink arcs.
 *
 * <p>Extracted from {@link MismoImporter} as part of audit item CR-2.
 * Behavior preserved; the orchestrator now delegates.
 */
@Component
@Slf4j
public class AssetSectionImporter {

    /**
     * Single entry point. Applies DEAL-level assets to borrowers.
     */
    public void apply(Document doc, LoanApplication la, LinkContext links,
                      List<MismoImporter.FieldChange> changes) throws XPathExpressionException {
        applyAssets(doc, la, links, changes);
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
                             List<MismoImporter.FieldChange> changes) throws XPathExpressionException {
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
            changes.add(new MismoImporter.FieldChange("assets", "<replaced>", kept + " row(s)"));
        }
    }

    /**
     * Routes an ASSET / LIABILITY / REO node to its owning Borrower via xlink.
     * Strategy:
     *   1. Read the node's xlink:label (e.g. "ASSET_2") and follow the
     *      RELATIONSHIPS arc to the linked ROLE label (e.g. "BORROWER_2").
     *   2. The ROLE element carries SequenceNumber — match THAT to the
     *      borrower's sequenceNumber. (Earlier code walked up to PARTY and
     *      read PARTY.SequenceNumber, but LP omits it on the borrower
     *      parties, so every multi-borrower routing fell through.)
     *   3. Fallback when the relationship is absent: single-borrower loans
     *      assign everything to the sole borrower.
     *
     * <p>Package-private so {@link ReoSectionImporter} and {@link MismoImporter}
     * (for liabilities) can reuse it.
     */
    static Borrower resolveAssetOwner(Element asset, LinkContext links, List<Borrower> borrowers) {
        String assetLabel = asset.getAttributeNS(LinkContext.XLINK_NS, "label");
        if (!assetLabel.isEmpty()) {
            String roleLabel = links.arcsByFrom.get(assetLabel);
            if (roleLabel != null) {
                Element role = links.elementsByLabel.get(roleLabel);
                if (role != null) {
                    int seq = parseSeq(role, 0);
                    for (Borrower b : borrowers) {
                        if (b.getSequenceNumber() != null && b.getSequenceNumber() == seq) return b;
                    }
                    // Defensive: walk up to PARTY and try PARTY.SequenceNumber too,
                    // in case a future export carries it on the party rather than the role.
                    org.w3c.dom.Node n = role;
                    while (n != null && !"PARTY".equals(n.getLocalName())) n = n.getParentNode();
                    if (n != null) {
                        int partySeq = parseSeq((Element) n, 0);
                        if (partySeq != seq) {
                            for (Borrower b : borrowers) {
                                if (b.getSequenceNumber() != null && b.getSequenceNumber() == partySeq) return b;
                            }
                        }
                    }
                }
            }
        }
        if (borrowers.size() == 1) return borrowers.get(0);
        return null;
    }
}
