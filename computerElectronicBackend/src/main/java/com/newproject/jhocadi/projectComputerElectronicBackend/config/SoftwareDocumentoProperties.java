package com.newproject.jhocadi.projectComputerElectronicBackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * Autoría del software en pie de PDFs de servicio (discreta, no contenido principal).
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.software")
public class SoftwareDocumentoProperties {

    private String developedBy = "Jhossuant Cabezas";
    private String developerRole = "Full Stack Developer";

    /** Texto exacto de autoría para documentos PDF. */
    public String lineaAutoria() {
        String nombre = developedBy != null ? developedBy.trim() : "";
        String rol = developerRole != null ? developerRole.trim() : "";
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
