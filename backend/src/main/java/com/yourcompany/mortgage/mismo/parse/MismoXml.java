package com.yourcompany.mortgage.mismo.parse;

import org.w3c.dom.Document;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

/**
 * MISMO XML parsing primitives. XXE-protected DocumentBuilder + namespace-agnostic
 * XPath factory. Pure utility — no business logic.
 */
public final class MismoXml {
    private MismoXml() {}

    /** Parse an XML stream into a {@link Document} with XXE protection enabled. */
    public static Document parse(InputStream xml)
            throws ParserConfigurationException, IOException, SAXException {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        f.setFeature("http://xml.org/sax/features/external-general-entities", false);
        f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        f.setNamespaceAware(true);
        DocumentBuilder b = f.newDocumentBuilder();
        return b.parse(new InputSource(xml));
    }

    /** Fresh XPath instance — XPath isn't thread-safe so we make one per call site. */
    public static XPath xp() {
        return XPathFactory.newInstance().newXPath();
    }

    /**
     * Read {@code ABOUT_VERSION/CreatedDatetime} from the MISMO file. Tries
     * {@link OffsetDateTime} first (MISMO standard), falls back to
     * {@link LocalDateTime} for offset-less timestamps. Returns null when
     * absent or unparseable.
     */
    public static LocalDateTime readCreatedDatetime(Document doc) throws XPathExpressionException {
        String dt = (String) xp().evaluate(
                "string(//*[local-name()='ABOUT_VERSION']/*[local-name()='CreatedDatetime'])",
                doc, XPathConstants.STRING);
        if (dt == null || dt.isBlank()) return null;
        try {
            return OffsetDateTime.parse(dt).toLocalDateTime();
        } catch (Exception e) {
            try { return LocalDateTime.parse(dt); } catch (Exception ee) { return null; }
        }
    }
}
