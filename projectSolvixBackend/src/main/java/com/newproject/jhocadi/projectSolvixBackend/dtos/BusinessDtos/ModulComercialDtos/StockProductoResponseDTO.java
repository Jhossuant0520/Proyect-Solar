package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StockProductoResponseDTO {

    private Long productoId;
    private String productoNombre;
    private Integer stockActual;
    private BigDecimal costoActual;
    private boolean costoConocido;
    private LocalDateTime fechaUltimoMovimiento;
}
