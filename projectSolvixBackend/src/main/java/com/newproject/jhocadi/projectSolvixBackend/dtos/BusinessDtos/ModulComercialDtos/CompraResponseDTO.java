package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumentoExternoCompra;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompraResponseDTO {

    private Long id;
    private String numero;
    private LocalDateTime fecha;
    private Long proveedorId;
    private String proveedorNombre;
    private String proveedorDocumento;
    private TipoDocumentoExternoCompra tipoDocumentoExterno;
    private String numeroDocumentoExterno;
    private String numeroOrdenCompra;
    private String numeroCotizacionProveedor;
    private LocalDateTime fechaDocumentoProveedor;
    private LocalDateTime fechaEntrega;
    private LocalDateTime fechaVencimiento;
    private CondicionPagoProveedor condicionPagoAplicada;
    private Integer diasCreditoAplicados;
    private String moneda;
    private Long contactoProveedorId;
    private String contactoNombreSnapshot;
    private BigDecimal subtotal;
    private BigDecimal descuento;
    private BigDecimal impuestoTotal;
    private BigDecimal total;
    private EstadoCompra estado;
    private String observaciones;
    private LocalDateTime fechaCompletada;
    private LocalDateTime fechaAnulada;
    private String createdBy;
    private List<DetalleCompraResponseDTO> detalles;

    public static CompraResponseDTO fromEntity(Compra compra) {
        return CompraResponseDTO.builder()
            .id(compra.getId())
            .numero(compra.getNumero())
            .fecha(compra.getFecha())
            .proveedorId(compra.getProveedor() != null ? compra.getProveedor().getId() : null)
            .proveedorNombre(resolverProveedorNombre(compra))
            .proveedorDocumento(resolverProveedorDocumento(compra))
            .tipoDocumentoExterno(compra.getTipoDocumentoExterno())
            .numeroDocumentoExterno(compra.getNumeroDocumentoExterno())
            .numeroOrdenCompra(compra.getNumeroOrdenCompra())
            .numeroCotizacionProveedor(compra.getNumeroCotizacionProveedor())
            .fechaDocumentoProveedor(compra.getFechaDocumentoProveedor())
            .fechaEntrega(compra.getFechaEntrega())
            .fechaVencimiento(compra.getFechaVencimiento())
            .condicionPagoAplicada(compra.getCondicionPagoAplicada())
            .diasCreditoAplicados(compra.getDiasCreditoAplicados())
            .moneda(compra.getMoneda() != null ? compra.getMoneda() : "COP")
            .contactoProveedorId(compra.getContactoProveedorId())
            .contactoNombreSnapshot(compra.getContactoNombreSnapshot())
            .subtotal(compra.getSubtotal())
            .descuento(compra.getDescuento())
            .impuestoTotal(compra.getImpuestoTotal() != null ? compra.getImpuestoTotal() : BigDecimal.ZERO)
            .total(compra.getTotal())
            .estado(compra.getEstado())
            .observaciones(compra.getObservaciones())
            .fechaCompletada(compra.getFechaCompletada())
            .fechaAnulada(compra.getFechaAnulada())
            .createdBy(compra.getCreatedBy())
            .detalles(compra.getDetalles().stream().map(DetalleCompraResponseDTO::fromEntity).toList())
            .build();
    }

    private static String resolverProveedorNombre(Compra compra) {
        if (compra.getProveedorNombreSnapshot() != null && !compra.getProveedorNombreSnapshot().isBlank()) {
            return compra.getProveedorNombreSnapshot();
        }
        return compra.getProveedor() != null ? compra.getProveedor().getNombre() : null;
    }

    private static String resolverProveedorDocumento(Compra compra) {
        if (compra.getProveedorDocumentoSnapshot() != null && !compra.getProveedorDocumentoSnapshot().isBlank()) {
            return compra.getProveedorDocumentoSnapshot();
        }
        return compra.getProveedor() != null ? compra.getProveedor().getDocumento() : null;
    }
}
