package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.AjusteCostoProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoAjusteCosto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AjusteCostoResponseDTO {

    private Long id;
    private Long productoId;
    private String productoNombre;
    private BigDecimal costoAnterior;
    private BigDecimal costoNuevo;
    private BigDecimal costoProductoResultante;

    /** Se informa para dejar explícito que el ajuste de costo no movió unidades. */
    private Integer stockAlAjustar;

    private MotivoAjusteCosto motivo;
    private String observaciones;
    private String usuarioRegistro;
    private LocalDateTime fecha;

    public static AjusteCostoResponseDTO fromEntity(AjusteCostoProducto ajuste) {
        return AjusteCostoResponseDTO.builder()
            .id(ajuste.getId())
            .productoId(ajuste.getProducto() != null ? ajuste.getProducto().getId() : null)
            .productoNombre(ajuste.getProducto() != null ? ajuste.getProducto().getNombre() : null)
            .costoAnterior(ajuste.getCostoAnterior())
            .costoNuevo(ajuste.getCostoNuevo())
            .costoProductoResultante(ajuste.getCostoProductoResultante())
            .stockAlAjustar(ajuste.getStockAlAjustar())
            .motivo(ajuste.getMotivo())
            .observaciones(ajuste.getObservaciones())
            .usuarioRegistro(ajuste.getUsuarioRegistro())
            .fecha(ajuste.getFecha())
            .build();
    }
}
