package com.msfg.mortgage.service.parser;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

/**
 * Default {@link DocumentParser}. Free, no native deps, no OCR.
 *
 * <p>Heuristic for "is this a scanned PDF?": if average extracted-chars per
 * page is below {@code APP_MIN_EXTRACTED_CHARS_PER_PAGE} (default 50), the
 * doc is flagged. The orchestrator gates further evaluation on this flag.
 */
@Component
public class PdfBoxParser implements DocumentParser {

    private final int minCharsPerPage;

    public PdfBoxParser(
            @Value("${app.min-extracted-chars-per-page:50}") int minCharsPerPage) {
        this.minCharsPerPage = minCharsPerPage;
    }

    @Override
    public ParseResult parse(InputStream stream, String mimeType, String filename) {
        try {
            if (mimeType != null && (mimeType.startsWith("text/") || mimeType.equals("text/csv"))) {
                String txt = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
                return new ParseResult(txt, 1, "pdfbox", false, BigDecimal.ZERO);
            }

            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            stream.transferTo(buf);
            byte[] bytes = buf.toByteArray();

            try (PDDocument pdf = Loader.loadPDF(bytes)) {
                int pageCount = pdf.getNumberOfPages();
                String text = new PDFTextStripper().getText(pdf);
                int chars = text == null ? 0 : text.trim().length();
                int charsPerPage = pageCount == 0 ? 0 : chars / pageCount;
                boolean scannedLikely = charsPerPage < minCharsPerPage;
                return new ParseResult(
                        text == null ? "" : text,
                        pageCount,
                        "pdfbox",
                        scannedLikely,
                        BigDecimal.ZERO);
            }
        } catch (Exception e) {
            throw new RuntimeException("PdfBoxParser failed on " + filename + ": " + e.getMessage(), e);
        }
    }
}
