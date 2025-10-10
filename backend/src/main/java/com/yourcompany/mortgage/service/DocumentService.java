package com.yourcompany.mortgage.service;

import com.yourcompany.mortgage.dto.DocumentDTO;
import com.yourcompany.mortgage.model.Document;
import com.yourcompany.mortgage.model.LoanApplication;
import com.yourcompany.mortgage.repository.DocumentRepository;
import com.yourcompany.mortgage.repository.LoanApplicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private LoanApplicationRepository loanApplicationRepository;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    public DocumentDTO uploadDocument(Long applicationId, String documentType, MultipartFile file) throws IOException {
        // Validate application exists
        LoanApplication application = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + applicationId));

        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }

        // Clean filename
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new IllegalArgumentException("Invalid file name");
        }
        originalFilename = StringUtils.cleanPath(originalFilename);
        
        // Generate unique filename to avoid conflicts
        String fileExtension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFilename.substring(dotIndex);
        }
        String uniqueFilename = UUID.randomUUID().toString() + fileExtension;

        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        // Create application-specific subdirectory
        Path applicationPath = uploadPath.resolve(applicationId.toString());
        Files.createDirectories(applicationPath);

        // Save file
        Path targetLocation = applicationPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Save document metadata
        Document document = new Document();
        document.setApplication(application);
        document.setDocumentType(documentType);
        document.setFileName(originalFilename);
        document.setFilePath(targetLocation.toString());
        document.setFileSize(file.getSize());
        document.setUploadedAt(LocalDateTime.now());

        Document savedDocument = documentRepository.save(document);

        return convertToDTO(savedDocument);
    }

    public List<DocumentDTO> getApplicationDocuments(Long applicationId) {
        List<Document> documents = documentRepository.findByApplicationId(applicationId);
        return documents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Resource downloadDocument(Long documentId) throws IOException {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        Path filePath = Paths.get(document.getFilePath()).normalize();
        Resource resource = new UrlResource(filePath.toUri());

        if (resource.exists() && resource.isReadable()) {
            return resource;
        } else {
            throw new RuntimeException("File not found or not readable: " + document.getFileName());
        }
    }

    public void deleteDocument(Long documentId) throws IOException {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        // Delete physical file
        Path filePath = Paths.get(document.getFilePath()).normalize();
        Files.deleteIfExists(filePath);

        // Delete database record
        documentRepository.delete(document);
    }

    public DocumentDTO getDocumentById(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));
        return convertToDTO(document);
    }

    private DocumentDTO convertToDTO(Document document) {
        return new DocumentDTO(
                document.getId(),
                document.getApplication().getId(),
                document.getDocumentType(),
                document.getFileName(),
                document.getFilePath(),
                document.getFileSize(),
                document.getUploadedAt()
        );
    }
}

