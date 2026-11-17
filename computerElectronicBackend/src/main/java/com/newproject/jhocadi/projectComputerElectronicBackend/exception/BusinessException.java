package com.newproject.jhocadi.projectComputerElectronicBackend.exception;

/**
 * Excepción de negocio de la aplicación. Se mapea a HTTP 400 en el manejador global.
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}
