package com.msfg.mortgage.service.parser;

import com.msfg.mortgage.service.parser.DocumentParser.ParseResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;

class PdfBoxParserTest {

    private final DocumentParser parser = new PdfBoxParser(50);

    @Test
    void parse_textPdf_returnsExtractedTextAndPageCount() throws Exception {
        InputStream pdf = textPdf(
                "Borrower income summary for May 2026: $5,200.00 base pay.\n"
                        + "Year to date earnings: $26,000.00 across five pay periods.");

        ParseResult result = parser.parse(pdf, "application/pdf", "income.pdf");

        assertThat(result.text()).contains("Borrower income");
        assertThat(result.text()).contains("$5,200");
        assertThat(result.pageCount()).isEqualTo(1);
        assertThat(result.parser()).isEqualTo("pdfbox");
        assertThat(result.scannedLikely()).isFalse();
        assertThat(result.costUsd()).isEqualByComparingTo("0");
    }

    @Test
    void parse_emptyPdf_marksScannedLikely() throws Exception {
        InputStream pdf = blankPdf(3); // 3 blank pages, 0 chars

        ParseResult result = parser.parse(pdf, "application/pdf", "scan.pdf");

        assertThat(result.text()).isEmpty();
        assertThat(result.pageCount()).isEqualTo(3);
        assertThat(result.scannedLikely()).isTrue();
    }

    @Test
    void parse_plainText_readsDirectly() {
        InputStream txt = new ByteArrayInputStream("hello world".getBytes());

        ParseResult result = parser.parse(txt, "text/plain", "note.txt");

        assertThat(result.text()).isEqualTo("hello world");
        assertThat(result.pageCount()).isEqualTo(1);
        assertThat(result.scannedLikely()).isFalse();
    }

    @Test
    void parse_corruptPdf_throwsRuntimeException() {
        InputStream junk = new ByteArrayInputStream("not a pdf".getBytes());

        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> parser.parse(junk, "application/pdf", "broken.pdf")
        ).isInstanceOf(RuntimeException.class);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private static InputStream textPdf(String body) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(72, 720);
                for (String line : body.split("\n")) {
                    cs.showText(line);
                    cs.newLineAtOffset(0, -16);
                }
                cs.endText();
            }
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            doc.save(bos);
            return new ByteArrayInputStream(bos.toByteArray());
        }
    }

    private static InputStream blankPdf(int pages) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < pages; i++) doc.addPage(new PDPage());
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            doc.save(bos);
            return new ByteArrayInputStream(bos.toByteArray());
        }
    }
}
