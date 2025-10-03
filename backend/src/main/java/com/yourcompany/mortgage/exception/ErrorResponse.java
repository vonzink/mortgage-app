package com.yourcompany.mortgage.exception;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Standard error response structure for API errors
 */
@Data
@Builder
public class ErrorResponse {
    
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
}
