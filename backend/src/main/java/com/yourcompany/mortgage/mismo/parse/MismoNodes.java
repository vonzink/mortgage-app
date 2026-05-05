package com.yourcompany.mortgage.mismo.parse;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;

/**
 * DOM helpers for namespace-agnostic MISMO traversal. All lookups use
 * {@code local-name()} so MISMO 3.x default namespace + xlink combos don't
 * require XPath {@code NamespaceContext} configuration.
 */
public final class MismoNodes {
    private MismoNodes() {}

    /** First child {@code Element} with the given local name; returns its trimmed text or null. */
    public static String textOf(Element parent, String childLocalName) {
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

    /**
     * XPath single-node text extractor. Returns trimmed text or null if missing/empty —
     * never an empty string, so callers can do truthiness-style null checks.
     */
    public static String pluck(Object context, String xpath) throws XPathExpressionException {
        Object obj = MismoXml.xp().evaluate(xpath, context, XPathConstants.NODE);
        if (obj == null) return null;
        Node n = (Node) obj;
        String t = n.getTextContent();
        if (t == null) return null;
        String trimmed = t.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** XPath single-element extractor. */
    public static Element first(Object context, String xpath) throws XPathExpressionException {
        Node n = (Node) MismoXml.xp().evaluate(xpath, context, XPathConstants.NODE);
        return (n instanceof Element) ? (Element) n : null;
    }

    /**
     * Find the {@code TaxpayerIdentifierValue} for a specific {@code TaxpayerIdentifierType}
     * (e.g. {@code SocialSecurityNumber}, {@code IndividualTaxpayerIdentificationNumber}).
     * Used because MISMO can carry multiple TAXPAYER_IDENTIFIER blocks per party.
     */
    public static String pluckTaxId(Element party, String type) throws XPathExpressionException {
        NodeList ids = (NodeList) MismoXml.xp().evaluate(
                ".//*[local-name()='TAXPAYER_IDENTIFIER']", party, XPathConstants.NODESET);
        for (int i = 0; i < ids.getLength(); i++) {
            Element e = (Element) ids.item(i);
            if (type.equals(textOf(e, "TaxpayerIdentifierType"))) {
                return textOf(e, "TaxpayerIdentifierValue");
            }
        }
        return null;
    }

    /** Parse the {@code SequenceNumber} attribute, returning the fallback if absent or non-numeric. */
    public static int parseSeq(Element party, int fallback) {
        String s = party.getAttribute("SequenceNumber");
        if (s == null || s.isBlank()) return fallback;
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return fallback; }
    }
}
