package com.msfg.mortgage.service;

import com.msfg.mortgage.config.LlmConfig;
import com.msfg.mortgage.exception.ResourceNotFoundException;
import com.msfg.mortgage.model.*;
import com.msfg.mortgage.repository.*;
import com.msfg.mortgage.service.llm.LlmException;
import com.msfg.mortgage.service.llm.LlmProvider;
import com.msfg.mortgage.service.llm.LlmProvider.LlmRequest;
import com.msfg.mortgage.service.llm.LlmProvider.LlmResult;
import com.msfg.mortgage.service.llm.LlmProviderRegistry;
import com.msfg.mortgage.service.parser.DocumentParser;
import com.msfg.mortgage.service.parser.DocumentParser.ParseResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Orchestrates the 11-step guardrail flow for per-folder AI evaluation:
 * <ol start="0">
 *   <li>feature toggle</li>
 *   <li>prompt exists on the folder template</li>
 *   <li>DeepSeek prod gate</li>
 *   <li>list documents in this loan + folder</li>
 *   <li>parse all documents</li>
 *   <li>page cap</li>
 *   <li>OCR gate (image-only PDFs deferred)</li>
 *   <li>token estimate + per-eval hard cap</li>
 *   <li>monthly budget cap</li>
 *   <li>provider call</li>
 *   <li>persist (every branch hits persist — every click is an audit row)</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FolderEvaluationService {

    private static final String SYSTEM_PROMPT = """
        You are an expert mortgage underwriting assistant. Read the documents
        provided and produce ONE JSON object with this exact shape:
        {"status":"ok","markdown":"<your markdown analysis here>"}
        The markdown field is what the loan officer reads. Use headings, bullets,
        and tables freely. Do NOT include any text outside the JSON object.
        """;

    private final AppSettingsRepository appSettings;
    private final FolderTemplateRepository folderTemplates;
    private final FolderEvaluationRepository evals;
    private final DocumentRepository documents;
    private final LlmProviderRegistry registry;
    private final DocumentParser parser;
    private final LlmConfig config;
    private final Environment env;
    private final S3Client s3Client;
    private final ObjectMapper json = new ObjectMapper();

    @org.springframework.beans.factory.annotation.Value("${aws.s3.documents-bucket}")
    private String bucket;

    public FolderEvaluation evaluate(Long applicationId, Long folderTemplateId, Integer userId) {
        AppSettings settings = appSettings.singleton();

        // Step 0: feature toggle
        if (!Boolean.TRUE.equals(settings.getAiEvalEnabled())) {
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status("feature_disabled")
                    .providerCalled(false)
                    .reason("AI evaluation toggle is OFF")
                    .build());
        }

        // Step 1: prompt exists
        FolderTemplate folder = folderTemplates.findById(folderTemplateId)
                .orElseThrow(() -> new ResourceNotFoundException("folder template " + folderTemplateId));
        if (folder.getEvalPrompt() == null || folder.getEvalPrompt().isBlank()) {
            throw new IllegalArgumentException("no_prompt_for_folder");
        }

        String provider = settings.getLlmDefaultProvider();

        // Step 2: DeepSeek prod gate
        if ("deepseek".equals(provider) && isProdProfile() && !config.isAllowDeepseekInProd()) {
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status("provider_not_allowed")
                    .providerCalled(false)
                    .reason("DeepSeek disabled in production by default")
                    .build());
        }

        // Step 3: list documents in this loan + folder
        List<Document> docs = documents.findUploadedInFolderTemplate(applicationId, folderTemplateId);
        if (docs.isEmpty()) {
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status("no_documents")
                    .providerCalled(false)
                    .reason("Folder is empty")
                    .build());
        }

        // Step 4: parse all documents
        int totalPages = 0;
        boolean anyScanned = false;
        StringBuilder corpus = new StringBuilder();
        int i = 0;
        for (Document doc : docs) {
            i++;
            try (var stream = s3Client.getObject(GetObjectRequest.builder()
                    .bucket(bucket).key(doc.getFilePath()).build())) {
                ParseResult pr = parser.parse(stream, doc.getContentType(), doc.getFileName());
                totalPages += pr.pageCount();
                anyScanned |= pr.scannedLikely();
                corpus.append("=== Document ").append(i).append(" of ").append(docs.size())
                      .append(": ").append(doc.getFileName())
                      .append(" (").append(pr.pageCount()).append(" pages) ===\n")
                      .append(pr.text() == null ? "" : pr.text()).append("\n\n");
            } catch (Exception e) {
                return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                        .status("parse_failed")
                        .providerCalled(false)
                        .reason("Parser failed on " + doc.getFileName() + ": " + e.getMessage())
                        .documentIds(joinIds(docs))
                        .build());
            }
        }

        // Step 5: page cap
        if (totalPages > config.getMaxPagesPerEval()) {
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status("too_many_pages")
                    .providerCalled(false)
                    .pageCount(totalPages)
                    .documentIds(joinIds(docs))
                    .reason("page count " + totalPages + " > cap " + config.getMaxPagesPerEval())
                    .build());
        }

        // Step 6: OCR gate
        if (anyScanned) {
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status("needs_ocr")
                    .providerCalled(false)
                    .pageCount(totalPages)
                    .scannedLikely(true)
                    .documentIds(joinIds(docs))
                    .reason("One or more documents are scanned image-only; OCR not enabled in v1")
                    .build());
        }

        // Step 7: token estimate + cap
        String userPrompt = folder.getEvalPrompt() + "\n\n---\n\n[DOCUMENTS]\n" + corpus;
        int estTokens = userPrompt.length() / 4;  // cheap ~4 chars/token heuristic
        if (estTokens > config.getPerEvalTokenHardCap()) {
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status("too_large")
                    .providerCalled(false)
                    .estimatedInputTokens(estTokens)
                    .pageCount(totalPages)
                    .documentIds(joinIds(docs))
                    .reason("estimated " + estTokens + " > cap " + config.getPerEvalTokenHardCap())
                    .build());
        }

        // Step 8: monthly budget
        if (config.getMonthlyUsdCap() != null) {
            LocalDateTime monthStart = YearMonth.now(ZoneId.systemDefault())
                    .atDay(1).atStartOfDay();
            BigDecimal monthSpend = evals.sumCostSince(monthStart);
            if (monthSpend.compareTo(new BigDecimal(config.getMonthlyUsdCap())) >= 0) {
                return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                        .status("over_budget")
                        .providerCalled(false)
                        .estimatedInputTokens(estTokens)
                        .pageCount(totalPages)
                        .documentIds(joinIds(docs))
                        .reason("month-to-date $" + monthSpend + " >= cap $" + config.getMonthlyUsdCap())
                        .build());
            }
        }

        // Step 9: provider call
        LlmProvider llm = registry.resolve(provider);
        try {
            LlmResult res = llm.complete(new LlmRequest(
                    SYSTEM_PROMPT, userPrompt, 4096, settings.getLlmDefaultModel()));
            String markdown = extractMarkdown(res.content());
            BigDecimal cost = llm.estimateCostUsd(res.inputTokens(), res.outputTokens(), settings.getLlmDefaultModel());
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status("success")
                    .providerCalled(true)
                    .estimatedInputTokens(estTokens)
                    .actualInputTokens(res.inputTokens())
                    .actualOutputTokens(res.outputTokens())
                    .costUsd(cost)
                    .pageCount(totalPages)
                    .documentIds(joinIds(docs))
                    .promptSnapshot(folder.getEvalPrompt())
                    .responseMarkdown(markdown)
                    .build());
        } catch (LlmException e) {
            String status = e.isRateLimited() ? "rate_limited" : "provider_failed";
            return persist(skeleton(applicationId, folderTemplateId, settings, userId)
                    .status(status)
                    .providerCalled(true)
                    .estimatedInputTokens(estTokens)
                    .pageCount(totalPages)
                    .documentIds(joinIds(docs))
                    .promptSnapshot(folder.getEvalPrompt())
                    .errorMessage(e.getMessage())
                    .reason(e.getMessage())
                    .build());
        }
    }

    public java.util.Optional<FolderEvaluation> latestFor(Long applicationId, Long folderTemplateId) {
        return evals.latestFor(applicationId, folderTemplateId);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private FolderEvaluation.FolderEvaluationBuilder skeleton(
            Long appId, Long folderId, AppSettings s, Integer userId) {
        return FolderEvaluation.builder()
                .applicationId(appId)
                .folderTemplateId(folderId)
                .provider(s.getLlmDefaultProvider())
                .model(s.getLlmDefaultModel())
                .createdByUserId(userId)
                .parser("pdfbox")
                .costUsd(BigDecimal.ZERO);
    }

    private FolderEvaluation persist(FolderEvaluation entity) {
        return evals.save(entity);
    }

    private String joinIds(List<Document> docs) {
        return docs.stream().map(d -> String.valueOf(d.getId()))
                .collect(Collectors.joining(","));
    }

    private boolean isProdProfile() {
        for (String p : env.getActiveProfiles()) if ("prod".equalsIgnoreCase(p)) return true;
        return false;
    }

    private String extractMarkdown(String raw) {
        try {
            JsonNode node = json.readTree(raw);
            String md = node.path("markdown").asText(null);
            if (md != null && !md.isBlank()) return md;
        } catch (Exception ignored) { /* fall through */ }
        // If the provider didn't return our JSON envelope, store the raw content
        // as markdown so the LO at least sees something.
        return raw;
    }
}
