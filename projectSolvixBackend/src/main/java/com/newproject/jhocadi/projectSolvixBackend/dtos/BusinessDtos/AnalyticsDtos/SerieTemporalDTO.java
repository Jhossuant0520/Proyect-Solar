package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.util.List;

import lombok.Builder;
import lombok.Data;

/**
 * Serie de ventas ya agregada. Devuelve puntos listos para graficar, nunca el detalle
 * de operaciones: un mes de ventas son 31 puntos, no 100.000 filas.
 */
@Data
@Builder
public class SerieTemporalDTO {

    private PeriodoDTO periodo;
    private List<VentasSerieDTO> puntos;
    private EstadoMetrica estado;
}
