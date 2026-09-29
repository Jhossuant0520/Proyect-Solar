package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCotizacionComercial;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CotizacionComercialResponseDTO {

    private Long id;
    private String numero;
    private Long clienteId;
    private String clienteNombre;
    private String clienteDocumento;
    private boolean clienteConsumidorFinal;
    private EstadoCotizacionComercial estado;
    private LocalDateTime fecha;
    private LocalDateTime fechaPresentacion;
    private LocalDateTime fechaAprobacion;
    private LocalDateTime fechaRechazo;
    private LocalDateTime fechaAnulacion;
    private String usuarioCreacion;
    private BigDecimal subtotal;
    private BigDecimal total;
    private BigDecimal subtotalProductos;
    private BigDecimal subtotalManoObra;
    private BigDecimal subtotalOtros;
    private String observaciones;
    private String motivoRechazo;
    private List<DetalleCotizacionComercialResponseDTO> detalles;
    private DocumentoCotizacionComercialResponseDTO documentoVigente;
    /**
     * En Presentar: {@code true} solo si el PDF de esa operación se generó.
     * En el resto de lecturas: {@code true} si existe documento vigente.
     */
    private boolean documentoGenerado;

    private boolean puedeEditar;
    private boolean puedePresentar;
    private boolean puedeAprobar;
    private boolean puedeRechazar;
    private boolean puedeAnular;
}
