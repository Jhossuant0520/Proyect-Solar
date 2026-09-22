package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoCotizacionServicio;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CotizacionServicioResponseDTO {

    private Long id;
    private Long ordenServicioId;
    private String numero;
    private TipoCotizacionServicio tipo;
    private EstadoCotizacionServicio estado;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaPresentacion;
    private LocalDateTime fechaAprobacion;
    private LocalDateTime fechaRechazo;
    private String usuarioCreacion;
    private String usuarioPresentacion;
    private String usuarioAprobacion;
    private String usuarioRechazo;
    private BigDecimal subtotal;
    private BigDecimal total;
    private BigDecimal subtotalRepuestos;
    private BigDecimal subtotalManoObra;
    private BigDecimal subtotalOtros;
    private String observaciones;
    private String motivoAmpliacion;
    private List<DetalleCotizacionServicioResponseDTO> detalles;
    private boolean puedeEditar;
    private boolean puedePresentar;
    private boolean puedeAprobar;
    private boolean puedeRechazar;
}
