package com.newproject.jhocadi.projectSolvixBackend.exception;

import java.time.Instant;
import java.util.List;

/**
 * Cuerpo JSON estándar para errores de API.
 */
public record ApiErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path,
    List<String> details
) {
    public static ApiErrorResponse of(int status, String error, String message, String path) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, List.of());
    }

    public static ApiErrorResponse of(int status, String error, String message, String path, List<String> details) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, details);
    }
}
