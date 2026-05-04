package com.yourcompany.mortgage.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

/**
 * Server-side guards on what we'll let into the documents bucket.
 *
 * - Content-Type must be in an explicit allow-list.
 * - Filename extension must NOT be in a deny-list of executable / scripty types.
 * - Size limit enforced at confirm time against the HEAD response.
 *
 * The presigned PUT URL is generated with contentType pinned, so a client can't
 * lie about Content-Type after we've issued the URL — S3 enforces it on PUT.
 */
@Component
public class DocumentUploadValidator {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/heic",
            "image/heif",
            "image/tiff",
            "image/webp",
            "text/plain",
            "text/csv",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private static final Set<String> DENIED_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "com", "scr", "msi", "vbs", "vbe",
            "js", "jse", "wsf", "wsh", "ps1", "psm1", "psd1",
            "jar", "sh", "bash", "zsh", "app", "dmg", "iso",
            "html", "htm", "svg", "xhtml"
    );

    @Value("${aws.s3.max-upload-bytes:52428800}") // 50 MiB default
    private long maxUploadBytes;

    public void validateRequested(String contentType, String fileName) {
        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException("contentType is required");
        }
        String normalized = contentType.toLowerCase(Locale.ROOT).trim();
        // Ignore any charset suffix when matching.
        int semi = normalized.indexOf(';');
        if (semi >= 0) normalized = normalized.substring(0, semi).trim();
        if (!ALLOWED_CONTENT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Content type not allowed: " + contentType);
        }

        String ext = extensionOf(fileName);
        if (ext != null && DENIED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("File extension not allowed: ." + ext);
        }
    }

    public void validateUploadedSize(long actualBytes) {
        if (actualBytes <= 0) {
            throw new IllegalStateException("Uploaded object has zero or unknown size");
        }
        if (actualBytes > maxUploadBytes) {
            throw new IllegalArgumentException(
                    "Uploaded file exceeds maximum size: " + actualBytes + " > " + maxUploadBytes);
        }
    }

    public long getMaxUploadBytes() { return maxUploadBytes; }

    private static String extensionOf(String fileName) {
        if (fileName == null) return null;
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return null;
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
