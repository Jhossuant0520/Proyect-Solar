package com.newproject.jhocadi.projectSolvixBackend.exception;

/**
 * Excepción de negocio de SOLVIX. Se mapea a HTTP 400 en el manejador global.
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}
