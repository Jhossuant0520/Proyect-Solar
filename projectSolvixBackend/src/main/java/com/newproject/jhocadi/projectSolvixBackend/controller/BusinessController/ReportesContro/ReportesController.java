package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ReportesContro;

import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CompraAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CriterioRanking;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ReportesDtos.ReporteInventarioResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ReportesDtos.ReporteVentasResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ReportesService.ReportesService;

import lombok.RequiredArgsConstructor;

/**
 * Report API delgada (FASE 3.15.12-B.1). Orquesta Analytics + export CSV.
 * No redefine fórmulas comerciales.
 */
@RestController
@RequestMapping("/api/v1/reportes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ReportesController {

    private static final MediaType TEXT_CSV = MediaType.parseMediaType("text/csv");

    private final ReportesService reportesService;

    @GetMapping("/ventas/resumen")
    public ResponseEntity<ReporteVentasResumenDTO> ventasResumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Agrupacion agrupacion) {
        return ResponseEntity.ok(reportesService.resumenVentas(desde, hasta, agrupacion));
    }

    @GetMapping("/ventas/exportar")
    public ResponseEntity<byte[]> ventasExportar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Agrupacion agrupacion) {
        return csv(reportesService.exportarVentasCsv(desde, hasta, agrupacion), "ventas.csv");
    }

    @GetMapping("/compras/resumen")
    public ResponseEntity<CompraAnalyticsDTO> comprasResumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Agrupacion agrupacion,
            @RequestParam(required = false) Long proveedorId) {
        return ResponseEntity.ok(reportesService.resumenCompras(desde, hasta, agrupacion, proveedorId));
    }

    @GetMapping("/compras/exportar")
    public ResponseEntity<byte[]> comprasExportar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Agrupacion agrupacion,
            @RequestParam(required = false) Long proveedorId) {
        return csv(reportesService.exportarComprasCsv(desde, hasta, agrupacion, proveedorId), "compras.csv");
    }

    @GetMapping("/inventario/resumen")
    public ResponseEntity<ReporteInventarioResumenDTO> inventarioResumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Integer umbralStockCritico,
            @RequestParam(required = false) CriterioRanking criterio,
            @RequestParam(defaultValue = "true") boolean incluirAbc) {
        return ResponseEntity.ok(
            reportesService.resumenInventario(desde, hasta, umbralStockCritico, criterio, incluirAbc));
    }

    @GetMapping("/inventario/exportar")
    public ResponseEntity<byte[]> inventarioExportar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Integer umbralStockCritico,
            @RequestParam(required = false) CriterioRanking criterio,
            @RequestParam(defaultValue = "true") boolean incluirAbc) {
        return csv(
            reportesService.exportarInventarioCsv(desde, hasta, umbralStockCritico, criterio, incluirAbc),
            "inventario.csv");
    }

    private ResponseEntity<byte[]> csv(byte[] body, String filename) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(TEXT_CSV)
            .body(body);
    }
}
