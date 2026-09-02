package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PeriodoDTO {

    private LocalDateTime desde;
    private LocalDateTime hasta;
    private long dias;
    private Agrupacion agrupacion;
}
