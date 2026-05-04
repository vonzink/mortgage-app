package com.yourcompany.mortgage.mismo;

import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

/**
 * Tiny helper around XMLStreamWriter — gives us the common patterns we use
 * to build MISMO documents without 4-line elements everywhere.
 */
final class MismoXmlWriter {

    private final XMLStreamWriter w;

    MismoXmlWriter(XMLStreamWriter w) {
        this.w = w;
    }

    /** Open an element, optionally as the document root with namespaces. */
    void start(String name) throws XMLStreamException {
        w.writeStartElement(name);
    }

    void end() throws XMLStreamException {
        w.writeEndElement();
    }

    /** Element with text body: {@code <Tag>value</Tag>}. */
    void simple(String name, String value) throws XMLStreamException {
        w.writeStartElement(name);
        if (value != null) w.writeCharacters(value);
        w.writeEndElement();
    }

    /** Same but accepts any object — uses toString(), null becomes empty. */
    void simple(String name, Object value) throws XMLStreamException {
        simple(name, value == null ? "" : String.valueOf(value));
    }

    /** Boolean → "true" / "false". */
    void bool(String name, boolean value) throws XMLStreamException {
        simple(name, value ? "true" : "false");
    }

    void attr(String name, String value) throws XMLStreamException {
        w.writeAttribute(name, value);
    }

    void namespace(String prefix, String uri) throws XMLStreamException {
        w.writeNamespace(prefix, uri);
    }

    void defaultNamespace(String uri) throws XMLStreamException {
        w.writeDefaultNamespace(uri);
    }

    void document() throws XMLStreamException {
        w.writeStartDocument("UTF-8", "1.0");
    }

    void endDocument() throws XMLStreamException {
        w.writeEndDocument();
    }
}
