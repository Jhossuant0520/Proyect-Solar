package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConsultaOtPublicaDTO {

    private String numero;
    /** Código del estado. La UI resuelve sus textos con él, nunca con {@code estadoPublico}. */
    private String estadoCodigo;
    private String estadoPublico;
    /** Etapa visible (RECEPCION…ENTREGA). null en CANCELADO. */
    private String etapaPublica;
    /** Número de etapa 1..{@code totalEtapasPublicas}. null en CANCELADO. */
    private Integer etapaPublicaNumero;
    private int totalEtapasPublicas;
    private String equipoTipo;
    private String equipoMarca;
    private String equipoModelo;
    /** Alias que el cliente dio al equipo (ej. "Laptop contabilidad"). Opcional. */
    private String referenciaInterna;
    private LocalDateTime fechaRecepcion;
    private LocalDateTime fechaActualizacion;
    /** true solo si hay una cotización presentada esperando respuesta del cliente. */
    private boolean cotizacionDisponible;
    private ContactoTallerPublicoDTO contacto;
    private String mensaje;
}
