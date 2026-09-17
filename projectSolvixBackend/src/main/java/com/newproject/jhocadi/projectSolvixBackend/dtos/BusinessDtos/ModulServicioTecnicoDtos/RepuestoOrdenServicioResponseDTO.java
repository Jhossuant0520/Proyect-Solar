package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoRepuestoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicioRepuesto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RepuestoOrdenServicioResponseDTO {

    private Long id;
    private Long ordenServicioId;
    private Long productoId;
    private String productoNombre;
    private String codigoBarras;
    private int cantidadPlanificada;
    private int cantidadConsumida;
    private int cantidadDevuelta;
    private int cantidadNetaConsumida;
    /** Planificada − neta; nunca negativa. */
    private int cantidadPendiente;
    /** Snapshot de costo al primer consumo; null = desconocido. */
    private BigDecimal costoHistorico;
    private boolean costoConocido;
    private boolean productoActivo;
    private EstadoRepuestoOrdenServicio estado;
    private boolean anulado;
    private LocalDateTime fechaRegistro;
    private LocalDateTime fechaUltimoConsumo;
    private LocalDateTime fechaUltimaDevolucion;
    private boolean puedeEditar;
    private boolean puedeEliminar;
    private boolean puedeConsumir;
    private boolean puedeDevolver;

    public static RepuestoOrdenServicioResponseDTO fromEntity(
            OrdenServicioRepuesto linea,
            boolean puedeEditar,
            boolean puedeEliminar,
            boolean puedeConsumir,
            boolean puedeDevolver) {
        return RepuestoOrdenServicioResponseDTO.builder()
            .id(linea.getId())
            .ordenServicioId(linea.getOrdenServicio() != null ? linea.getOrdenServicio().getId() : null)
            .productoId(linea.getProducto() != null ? linea.getProducto().getId() : null)
            .productoNombre(linea.getProductoNombre())
            .codigoBarras(linea.getProducto() != null ? linea.getProducto().getCodigoBarras() : null)
            .cantidadPlanificada(linea.getCantidadPlanificada())
            .cantidadConsumida(linea.getCantidadConsumida())
            .cantidadDevuelta(linea.getCantidadDevuelta())
            .cantidadNetaConsumida(linea.cantidadNetaConsumida())
            .cantidadPendiente(Math.max(0, linea.getCantidadPlanificada() - linea.cantidadNetaConsumida()))
            .costoHistorico(linea.getCostoUnitario())
            .costoConocido(linea.isCostoConocido())
            .productoActivo(linea.getProducto() == null || linea.getProducto().isActivo())
            .estado(linea.estadoDerivado())
            .anulado(linea.isAnulado())
            .fechaRegistro(linea.getFechaRegistro())
            .fechaUltimoConsumo(linea.getFechaUltimoConsumo())
            .fechaUltimaDevolucion(linea.getFechaUltimaDevolucion())
            .puedeEditar(puedeEditar)
            .puedeEliminar(puedeEliminar)
            .puedeConsumir(puedeConsumir)
            .puedeDevolver(puedeDevolver)
            .build();
    }
}
