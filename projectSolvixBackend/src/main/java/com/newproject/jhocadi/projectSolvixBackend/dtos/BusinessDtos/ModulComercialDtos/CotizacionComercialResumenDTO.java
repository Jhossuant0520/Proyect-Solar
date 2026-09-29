package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCotizacionComercial;

import lombok.Builder;
import lombok.Data;

/** Fila del listado: sin líneas, para no cargar detalles en la paginación. */
@Data
@Builder
public class CotizacionComercialResumenDTO {

    private Long id;
    private String numero;
    private String clienteNombre;
    private EstadoCotizacionComercial estado;
    private LocalDateTime fecha;
    private BigDecimal total;

    public static CotizacionComercialResumenDTO fromEntity(CotizacionComercial cotizacion) {
        return CotizacionComercialResumenDTO.builder()
            .id(cotizacion.getId())
            .numero(cotizacion.getNumero())
            .clienteNombre(cotizacion.getClienteNombreSnapshot())
            .estado(cotizacion.getEstado())
            .fecha(cotizacion.getFecha())
            .total(cotizacion.getTotal())
            .build();
    }
}
