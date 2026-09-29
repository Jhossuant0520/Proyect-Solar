package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

/**
 * Cotización de OT en modo lectura para el cliente (FASE C.2).
 * Solo lo que el cliente necesita para decidir: sin ids, usuarios, productos ni costos internos.
 */
@Data
@Builder
public class ConsultaCotizacionOtPublicaDTO {

    private String numero;
    private LocalDateTime fecha;
    private List<Linea> lineas;
    private BigDecimal subtotal;
    private BigDecimal total;
    private String observaciones;

    @Data
    @Builder
    public static class Linea {
        private String descripcion;
        private BigDecimal cantidad;
        private BigDecimal precioUnitario;
        private BigDecimal subtotal;
    }
}
