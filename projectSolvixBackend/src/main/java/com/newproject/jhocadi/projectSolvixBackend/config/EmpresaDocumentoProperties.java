package com.newproject.jhocadi.projectSolvixBackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * Datos corporativos para encabezado/pie de PDFs de servicio técnico.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "solvix.empresa")
public class EmpresaDocumentoProperties {

    private String nombre = "Computer & Electronic";
    private String subtitulo = "Servicio técnico especializado";
    private String telefono = "";
    private String whatsapp = "";
    private String correo = "";
    private String direccion = "";
    private String sitioWeb = "";
    private String identificacionFiscal = "";
    /** Ruta classpath relativa, ej. static/branding/logo-empresa.png */
    private String logoClasspath = "static/branding/logo-empresa.png";
    private String footerTexto = "Documento generado por SOLVIX";
}
