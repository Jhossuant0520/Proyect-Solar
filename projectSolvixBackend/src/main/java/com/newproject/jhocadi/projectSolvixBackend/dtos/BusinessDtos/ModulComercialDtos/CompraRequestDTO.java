package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumentoExternoCompra;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompraRequestDTO {

    @NotNull(message = "El proveedor es obligatorio.")
    private Long proveedorId;

    private LocalDateTime fecha;

    private TipoDocumentoExternoCompra tipoDocumentoExterno;

    @Size(max = 80)
    private String numeroDocumentoExterno;

    @Size(max = 80)
    private String numeroOrdenCompra;

    @Size(max = 80)
    private String numeroCotizacionProveedor;

    private LocalDateTime fechaDocumentoProveedor;

    private LocalDateTime fechaEntrega;

    private LocalDateTime fechaVencimiento;

    private CondicionPagoProveedor condicionPagoAplicada;

    private Integer diasCreditoAplicados;

    private Long contactoProveedorId;

    @Size(max = 150)
    private String contactoNombreSnapshot;

    @DecimalMin(value = "0.0", inclusive = true, message = "El descuento no puede ser negativo.")
    private BigDecimal descuento;

    /**
     * Ignorado en alta (FASE 3.15.11-C).
     * {@code impuestoTotal} lo calcula el backend como suma de impuestos de línea.
     * Conservado por compatibilidad de deserialización.
     */
    @Deprecated
    @DecimalMin(value = "0.0", inclusive = true, message = "El impuesto no puede ser negativo.")
    private BigDecimal impuestoTotal;

    @Size(max = 1000)
    private String observaciones;

    @NotEmpty(message = "La compra debe tener al menos un producto.")
    @Valid
    private List<DetalleCompraRequestDTO> detalles;
}
