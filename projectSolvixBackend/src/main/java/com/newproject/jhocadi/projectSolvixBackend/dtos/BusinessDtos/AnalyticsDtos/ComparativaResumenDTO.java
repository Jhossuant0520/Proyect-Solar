package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import lombok.Builder;
import lombok.Data;

/** Variaciones del resumen frente al período anterior equivalente. */
@Data
@Builder
public class ComparativaResumenDTO {

    private PeriodoDTO periodoAnterior;
    private VariacionDTO ventasBrutas;
    private VariacionDTO devoluciones;
    private VariacionDTO ventasNetas;
    private VariacionDTO gananciaBruta;
    private VariacionDTO margenBruto;
    private VariacionDTO pedidos;
    private VariacionDTO ticketPromedio;
}
