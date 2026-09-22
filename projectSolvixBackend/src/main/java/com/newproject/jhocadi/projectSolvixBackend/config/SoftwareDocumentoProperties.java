package com.newproject.jhocadi.projectSolvixBackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * Autoría del software en pie de PDFs de servicio (discreta, no contenido principal).
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "solvix.software")
public class SoftwareDocumentoProperties {

    private String desarrolladoPor = "Jhossuant Cabezas";
    private String rolDesarrollador = "Full Stack Developer";

    /** Texto exacto de autoría para documentos PDF. */
    public String lineaAutoria() {
        String nombre = desarrolladoPor != null ? desarrolladoPor.trim() : "";
        String rol = rolDesarrollador != null ? rolDesarrollador.trim() : "";
        if (nombre.isEmpty() && rol.isEmpty()) {
            return "";
        }
        if (rol.isEmpty()) {
            return "Desarrollado por " + nombre;
        }
        if (nombre.isEmpty()) {
            return rol;
        }
        return "Desarrollado por " + nombre + " · " + rol;
    }
}
