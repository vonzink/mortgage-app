package com.yourcompany.mortgage.mismo.parse;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import java.util.HashMap;
import java.util.Map;

/**
 * Two-way index of the xlink machinery used by MISMO 3.4 to associate elements that
 * don't live as parent/child in the document tree (e.g. DEAL-level ASSETs linked to
 * a BORROWER, or CURRENT_INCOME_ITEMs linked to an EMPLOYER).
 *
 * <ul>
 *   <li>{@code elementsByLabel} — every element that carries an {@code xlink:label}
 *       attribute, indexed by that label.</li>
 *   <li>{@code arcsByFrom} — for every {@code RELATIONSHIP} element, maps
 *       {@code xlink:from} → {@code xlink:to}.</li>
 *   <li>{@code arcsByTo} — the inverse (lets us answer "what was this employer
 *       linked from").</li>
 * </ul>
 *
 * Built once per import so each lookup is O(1) instead of repeated XPath scans.
 */
public final class LinkContext {
    public static final String XLINK_NS = "http://www.w3.org/1999/xlink";

    public final Map<String, Element> elementsByLabel = new HashMap<>();
    public final Map<String, String> arcsByFrom = new HashMap<>();
    public final Map<String, String> arcsByTo = new HashMap<>();

    public static LinkContext from(Document doc) throws XPathExpressionException {
        LinkContext ctx = new LinkContext();
        // Index every element that carries an xlink:label
        NodeList labeled = (NodeList) MismoXml.xp().evaluate(
                "//*[@*[local-name()='label']]", doc, XPathConstants.NODESET);
        for (int i = 0; i < labeled.getLength(); i++) {
            Element e = (Element) labeled.item(i);
            String label = e.getAttributeNS(XLINK_NS, "label");
            if (!label.isEmpty()) ctx.elementsByLabel.put(label, e);
        }
        // Index RELATIONSHIP arcs both ways
        NodeList rels = (NodeList) MismoXml.xp().evaluate(
                "//*[local-name()='RELATIONSHIP']", doc, XPathConstants.NODESET);
        for (int i = 0; i < rels.getLength(); i++) {
            Element r = (Element) rels.item(i);
            String from = r.getAttributeNS(XLINK_NS, "from");
            String to = r.getAttributeNS(XLINK_NS, "to");
            if (from.isEmpty() || to.isEmpty()) continue;
            ctx.arcsByFrom.put(from, to);
            ctx.arcsByTo.put(to, from);
        }
        return ctx;
    }
}
