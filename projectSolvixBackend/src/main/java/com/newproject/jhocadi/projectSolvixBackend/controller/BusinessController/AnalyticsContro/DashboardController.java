package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.AnalyticsContro;

import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.DashboardResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.DashboardAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.PeriodoAnalitico;

import lombok.RequiredArgsConstructor;

/**
 * Resumen ejecutivo. Sin fechas devuelve el mes en curso comparado con el mes anterior.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DashboardController {

    private final DashboardAnalyticsService dashboardAnalyticsService;

    @Value("${solvix.analytics.zona-horaria:America/Bogota}")
    private String zonaHoraria;

    @GetMapping("/resumen")
    public ResponseEntity<DashboardResumenDTO> resumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {

        PeriodoAnalitico periodo = PeriodoAnalitico.resolver(
            desde, hasta, Agrupacion.DIA, ZoneId.of(zonaHoraria));

        return ResponseEntity.ok(dashboardAnalyticsService.resumen(periodo));
    }
}
