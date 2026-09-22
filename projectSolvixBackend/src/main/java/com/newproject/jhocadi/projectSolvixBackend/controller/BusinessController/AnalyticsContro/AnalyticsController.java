package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.AnalyticsContro;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

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
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.AnalisisABCDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CategoriaAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CompraAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CriterioRanking;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.InventarioKpiDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoBajoRendimientoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoRankingDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.SerieTemporalDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.CategoriaAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.ComprasAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.InventarioAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.PeriodoAnalitico;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.ProductoAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.VentasAnalyticsService;

import lombok.RequiredArgsConstructor;

/**
 * Motor de analytics. Todos los endpoints devuelven datos ya agregados y listos para
 * visualizar: un mes de ventas son 31 puntos, nunca las operaciones que los produjeron.
 *
 * <p>El controller no calcula nada; solo resuelve el período y delega en los servicios.
 */
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private static final int LIMITE_RANKING_POR_DEFECTO = 10;

    private final VentasAnalyticsService ventasAnalyticsService;
    private final ProductoAnalyticsService productoAnalyticsService;
    private final CategoriaAnalyticsService categoriaAnalyticsService;
    private final InventarioAnalyticsService inventarioAnalyticsService;
    private final ComprasAnalyticsService comprasAnalyticsService;

    @Value("${solvix.analytics.zona-horaria:America/Bogota}")
    private String zonaHoraria;

    @GetMapping("/ventas")
    public ResponseEntity<SerieTemporalDTO> ventas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Agrupacion agrupacion) {
        return ResponseEntity.ok(ventasAnalyticsService.serie(periodo(desde, hasta, agrupacion)));
    }

    @GetMapping("/productos/top")
    public ResponseEntity<List<ProductoRankingDTO>> topProductos(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) CriterioRanking criterio,
            @RequestParam(required = false) String categoriaCodigo,
            @RequestParam(defaultValue = "10") int limite) {
        return ResponseEntity.ok(productoAnalyticsService.ranking(
            periodo(desde, hasta, null),
            criterio != null ? criterio : CriterioRanking.UNIDADES,
            limite(limite),
            categoriaCodigo));
    }

    @GetMapping("/productos/bajo-rendimiento")
    public ResponseEntity<List<ProductoBajoRendimientoDTO>> bajoRendimiento(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(defaultValue = "10") int limite) {
        return ResponseEntity.ok(
            productoAnalyticsService.bajoRendimiento(periodo(desde, hasta, null), limite(limite)));
    }

    /** Ranking por contribución monetaria. Con {@code criterio=MARGEN} ordena por rentabilidad relativa. */
    @GetMapping("/productos/rentables")
    public ResponseEntity<List<ProductoRankingDTO>> rentables(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) CriterioRanking criterio,
            @RequestParam(defaultValue = "10") int limite) {
        return ResponseEntity.ok(productoAnalyticsService.ranking(
            periodo(desde, hasta, null),
            criterio == CriterioRanking.MARGEN ? CriterioRanking.MARGEN : CriterioRanking.GANANCIA,
            limite(limite),
            null));
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<CategoriaAnalyticsDTO>> categorias(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Long categoriaId) {
        return ResponseEntity.ok(
            categoriaAnalyticsService.porCategoria(periodo(desde, hasta, null), categoriaId));
    }

    @GetMapping("/inventario")
    public ResponseEntity<InventarioKpiDTO> inventario(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Integer umbralStockCritico) {
        return ResponseEntity.ok(
            inventarioAnalyticsService.kpis(periodo(desde, hasta, null), umbralStockCritico));
    }

    @GetMapping("/inventario/abc")
    public ResponseEntity<AnalisisABCDTO> abc(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) CriterioRanking criterio) {
        return ResponseEntity.ok(
            productoAnalyticsService.analisisABC(periodo(desde, hasta, null), criterio));
    }

    @GetMapping("/compras")
    public ResponseEntity<CompraAnalyticsDTO> compras(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @RequestParam(required = false) Agrupacion agrupacion,
            @RequestParam(required = false) Long proveedorId) {
        return ResponseEntity.ok(
            comprasAnalyticsService.analytics(periodo(desde, hasta, agrupacion), proveedorId));
    }

    private PeriodoAnalitico periodo(LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion) {
        return PeriodoAnalitico.resolver(desde, hasta, agrupacion, ZoneId.of(zonaHoraria));
    }

    private int limite(int solicitado) {
        return solicitado > 0 ? solicitado : LIMITE_RANKING_POR_DEFECTO;
    }
}
