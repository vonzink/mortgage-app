package com.yourcompany.mortgage.mismo;

import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Pretty-printing wrapper around StAX {@link XMLStreamWriter} that turns this:
 * <pre>{@code
 *   try (var w = new MismoXmlWriter(out, MISMO_NS)) {
 *       w.startRoot("MESSAGE", Map.of("MISMOReferenceModelIdentifier", "3.4.032420160128"));
 *       w.parent("DEAL_SETS", () -> {
 *           w.parent("DEAL_SET", () -> {
 *               w.parent("DEALS", () -> {
 *                   w.parent("DEAL", () -> {
 *                       w.element("LoanIdentifier", "R008739");
 *                   });
 *               });
 *           });
 *       });
 *       w.endRoot();
 *   }
 * }</pre>
 *
 * <p>Encoding: UTF-8.  Indentation: 2 spaces per level.  Empty/null values are written as
 * self-closing tags (matching the LendingPad sample's style for empty fields).
 *
 * <p>Not thread-safe; one writer per export.
 */
public class MismoXmlWriter implements AutoCloseable {

    private static final XMLOutputFactory FACTORY = XMLOutputFactory.newInstance();
    private static final DateTimeFormatter DATETIME = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final XMLStreamWriter delegate;
    private final String defaultNamespace;
    private int depth = 0;

    public MismoXmlWriter(OutputStream out, String defaultNamespace) throws XMLStreamException {
        this.delegate = FACTORY.createXMLStreamWriter(out, "UTF-8");
        this.defaultNamespace = defaultNamespace;
    }

    /** Open the document + root element with namespace declarations. */
    public void startRoot(String rootName, Map<String, String> namespaces, Map<String, String> attrs) {
        try {
            delegate.writeStartDocument("UTF-8", "1.0");
            newline();
            delegate.writeStartElement(rootName);
            delegate.writeDefaultNamespace(defaultNamespace);
            for (var ns : namespaces.entrySet()) {
                delegate.writeNamespace(ns.getKey(), ns.getValue());
            }
            for (var a : attrs.entrySet()) {
                delegate.writeAttribute(a.getKey(), a.getValue());
            }
            depth++;
        } catch (XMLStreamException e) {
            throw new UncheckedIOException(new java.io.IOException(e));
        }
    }

    public void endRoot() {
        try {
            depth--;
            newline();
            delegate.writeEndElement();
            delegate.writeEndDocument();
            delegate.flush();
        } catch (XMLStreamException e) {
            throw new UncheckedIOException(new java.io.IOException(e));
        }
    }

    /**
     * Write a parent element containing children produced by the runnable. Indentation handled
     * automatically.
     */
    public void parent(String name, Runnable body) {
        parent(name, Map.of(), body);
    }

    public void parent(String name, Map<String, String> attrs, Runnable body) {
        try {
            newline();
            delegate.writeStartElement(name);
            for (var a : attrs.entrySet()) {
                delegate.writeAttribute(a.getKey(), a.getValue());
            }
            depth++;
            body.run();
            depth--;
            newline();
            delegate.writeEndElement();
        } catch (XMLStreamException e) {
            throw new UncheckedIOException(new java.io.IOException(e));
        }
    }

    /** Element with text content. Null/empty produces a self-closing tag. */
    public void element(String name, String value) {
        try {
            newline();
            if (value == null || value.isEmpty()) {
                delegate.writeEmptyElement(name);
            } else {
                delegate.writeStartElement(name);
                delegate.writeCharacters(value);
                delegate.writeEndElement();
            }
        } catch (XMLStreamException e) {
            throw new UncheckedIOException(new java.io.IOException(e));
        }
    }

    /** Skip writing entirely if the value is null. Used when a field is purely optional. */
    public void elementIfPresent(String name, String value) {
        if (value != null && !value.isEmpty()) element(name, value);
    }

    public void elementIfPresent(String name, Number value) {
        if (value != null) element(name, value.toString());
    }

    public void elementIfPresent(String name, BigDecimal value) {
        if (value != null) element(name, value.toPlainString());
    }

    public void elementIfPresent(String name, Boolean value) {
        if (value != null) element(name, value ? "true" : "false");
    }

    public void elementIfPresent(String name, LocalDate value) {
        if (value != null) element(name, value.format(DATE));
    }

    public void elementIfPresent(String name, LocalDateTime value) {
        if (value != null) element(name, value.atZone(java.time.ZoneOffset.UTC).format(DATETIME));
    }

    private void newline() throws XMLStreamException {
        if (depth >= 0) {
            delegate.writeCharacters("\n" + "  ".repeat(depth));
        }
    }

    @Override
    public void close() {
        try {
            delegate.close();
        } catch (XMLStreamException e) {
            // ignore on close
        }
    }

    public static Map<String, String> attrs(String... kv) {
        if (kv.length % 2 != 0) throw new IllegalArgumentException("attrs() needs even args");
        Map<String, String> m = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put(kv[i], kv[i + 1]);
        return m;
    }
}
