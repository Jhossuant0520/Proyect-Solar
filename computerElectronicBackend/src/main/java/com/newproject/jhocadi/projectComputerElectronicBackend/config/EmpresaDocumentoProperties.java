package com.newproject.jhocadi.projectComputerElectronicBackend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * Datos corporativos para encabezado/pie de PDFs de servicio técnico.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.company")
public class EmpresaDocumentoProperties {

    private String name = "Computer & Electronic";
    private String subtitle = "Servicio técnico especializado";
    /** Línea corta bajo el nombre (laboratorio / especialidad). */
    private String labLabel = "Servicio Técnico Especializado · Laboratorio de Ingeniería";
    private String phone = "";
    private String whatsapp = "";
    private String email = "";
    private String address = "";
    private String website = "";
    private String taxId = "";
    /** Ruta classpath relativa, ej. static/branding/LogoEmpresa1-pdf.png (asset PDF optimizado). */
    private String logoClasspath = "static/branding/LogoEmpresa1-pdf.png";
    private String footerText = "Documento generado digitalmente por Computer & Electronic Center S.A.S.";
    /** Meta superior izquierda en documentos Stitch. */
    private String documentMetaLeft = "Sistema de Gestión de Custodia Técnica";
    /** Meta superior derecha en documentos Stitch. */
    private String documentMetaRight = "Documento de Control y Seguimiento";
    /** Kicker del banner de comprobante de recepción. */
    private String receptionReceiptKicker = "Servicio Técnico · Protocolo de Ingreso";
    /** Cláusulas de custodia del comprobante de recepción (texto plano; se escapa al renderizar). */
    private String receptionReceiptClauses = "";
    /** Kicker del banner de acta de entrega. */
    private String deliveryActKicker = "Servicio Técnico · Protocolo de Entrega";
    /** Cláusulas legales del acta de entrega (texto plano; se escapa al renderizar). */
    private String deliveryActClauses = "";
}
