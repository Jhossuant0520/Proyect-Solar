package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrdenServicioResponseDTO {

    private Long id;
    private String numero;
    private Long clienteId;
    private String clienteNombre;
    private Long equipoId;
    private TipoEquipo equipoTipo;
    private String equipoMarca;
    private String equipoModelo;
    private String equipoNombre;
    private EstadoOrdenServicio estado;
    private String problemaReportado;
    private String diagnostico;
    private String trabajoRealizado;
    private String observaciones;
    private LocalDateTime fechaRecepcion;
    private LocalDateTime fechaActualizacion;
    private LocalDateTime fechaCierre;
    private String createdBy;

    public static OrdenServicioResponseDTO fromEntity(OrdenServicio orden) {
        return OrdenServicioResponseDTO.builder()
            .id(orden.getId())
            .numero(orden.getNumero())
            .clienteId(orden.getCliente() != null ? orden.getCliente().getId() : null)
            .clienteNombre(orden.getCliente() != null ? orden.getCliente().getNombre() : null)
            .equipoId(orden.getEquipo() != null ? orden.getEquipo().getId() : null)
            .equipoTipo(orden.getEquipo() != null ? orden.getEquipo().getTipoEquipo() : null)
            .equipoMarca(orden.getEquipo() != null ? orden.getEquipo().getMarca() : null)
            .equipoModelo(orden.getEquipo() != null ? orden.getEquipo().getModelo() : null)
            .equipoNombre(orden.getEquipo() != null ? orden.getEquipo().getReferenciaInterna() : null)
            .estado(orden.getEstado())
            .problemaReportado(orden.getProblemaReportado())
            .diagnostico(orden.getDiagnostico())
            .trabajoRealizado(orden.getTrabajoRealizado())
            .observaciones(orden.getObservaciones())
            .fechaRecepcion(orden.getFechaRecepcion())
            .fechaActualizacion(orden.getFechaActualizacion())
            .fechaCierre(orden.getFechaCierre())
            .createdBy(orden.getCreatedBy())
            .build();
    }
}
