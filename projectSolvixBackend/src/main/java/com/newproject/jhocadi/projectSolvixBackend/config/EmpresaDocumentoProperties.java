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
    /** Línea corta bajo el nombre (laboratorio / especialidad). */
    private String etiquetaLaboratorio = "Servicio Técnico Especializado · Laboratorio de Ingeniería";
    private String telefono = "";
    private String whatsapp = "";
    private String correo = "";
    private String direccion = "";
    private String sitioWeb = "";
    private String identificacionFiscal = "";
    /** Ruta classpath relativa, ej. static/branding/LogoEmpresa1-pdf.png (asset PDF optimizado). */
    private String logoClasspath = "static/branding/LogoEmpresa1-pdf.png";
    private String footerTexto = "Documento generado digitalmente por Computer & Electronic Center S.A.S.";
    /** Meta superior izquierda en documentos Stitch. */
    private String documentoMetaIzq = "Sistema de Gestión de Custodia Técnica";
    /** Meta superior derecha en documentos Stitch. */
    private String documentoMetaDer = "Documento de Control y Seguimiento";
    /** Kicker del banner de comprobante de recepción. */
    private String comprobanteRecepcionKicker = "Servicio Técnico · Protocolo de Ingreso";
    /** Cláusulas de custodia del comprobante de recepción (texto plano; se escapa al renderizar). */
    private String clausulasComprobanteRecepcion = "";
    /** Kicker del banner de acta de entrega. */
    private String actaEntregaKicker = "Servicio Técnico · Protocolo de Entrega";
    /** Cláusulas legales del acta de entrega (texto plano; se escapa al renderizar). */
    private String clausulasActaEntrega = "";
}
