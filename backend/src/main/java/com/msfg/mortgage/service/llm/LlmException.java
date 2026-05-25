package com.msfg.mortgage.service.llm;

/** Thrown by adapters when a provider call fails for any reason. */
public class LlmException extends RuntimeException {
    private final int httpStatus;
    public LlmException(int httpStatus, String message) { super(message); this.httpStatus = httpStatus; }
    public LlmException(int httpStatus, String message, Throwable cause) { super(message, cause); this.httpStatus = httpStatus; }
    public int getHttpStatus() { return httpStatus; }
    public boolean isRateLimited() { return httpStatus == 429; }
}
