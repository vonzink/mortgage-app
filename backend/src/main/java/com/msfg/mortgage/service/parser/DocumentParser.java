package com.msfg.mortgage.service.parser;

import java.io.InputStream;
import java.math.BigDecimal;

/**
 * Pluggable document text extractor. v1 ships only {@link PdfBoxParser};
 * the interface exists so OCR providers (textract, llamaparse) can drop in
 * without touching FolderEvaluationService.
 */
public interface DocumentParser {

    ParseResult parse(InputStream stream, String mimeType, String filename);

    record ParseResult(
            String text,
            int pageCount,
            String parser,            // "pdfbox" | "textract" | "llamaparse"
            boolean scannedLikely,
            BigDecimal costUsd        // 0 for pdfbox; non-zero when OCR adapters land
    ) {}
}
