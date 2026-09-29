package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

/** Consulta pública por QR: sin IDs internos, sin datos del cliente ni costos. */
@Data
@Builder
public class ConsultaCotizacionPublicaDTO {

    private String numero;
    private String estadoPublico;
    private LocalDateTime fecha;
    private BigDecimal total;
    private List<Linea> lineas;
    private String mensaje;

    @Data
    @Builder
    public static class Linea {
        private String descripcion;
        private BigDecimal cantidad;
        private BigDecimal subtotal;
    }
}
