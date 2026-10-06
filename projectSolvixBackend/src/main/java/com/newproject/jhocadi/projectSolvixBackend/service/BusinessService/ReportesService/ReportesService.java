package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ReportesService;

import java.io.PrintWriter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.AnalisisABCDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CompraAnalyticsDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.CriterioRanking;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.DashboardResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.InventarioKpiDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProductoCompradoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.ProveedorGastoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.SerieTemporalDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.VentasSerieDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ReportesDtos.ReporteInventarioResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ReportesDtos.ReporteVentasResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.CalculoAnalytics;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.ComprasAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.DashboardAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.InventarioAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.PeriodoAnalitico;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.ProductoAnalyticsService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService.VentasAnalyticsService;

import lombok.RequiredArgsConstructor;

/**
 * Orquestación delgada de Reportes (FASE 3.15.12-B.1).
 *
 * <p><b>Prohibido:</b> recalcular márgenes, IVA, totales o costos.
 * Solo consume DTOs del Analytics Engine y los serializa a CSV.
 */
@Service
@RequiredArgsConstructor
public class ReportesService {

    private final DashboardAnalyticsService dashboardAnalyticsService;
    private final VentasAnalyticsService ventasAnalyticsService;
    private final ComprasAnalyticsService comprasAnalyticsService;
    private final InventarioAnalyticsService inventarioAnalyticsService;
    private final ProductoAnalyticsService productoAnalyticsService;
    private final ReportCsvExportService csvExportService;

    @Value("${solvix.analytics.zona-horaria:America/Bogota}")
    private String zonaHoraria;

    @Transactional(readOnly = true)
    public ReporteVentasResumenDTO resumenVentas(
            LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion) {
        PeriodoAnalitico periodo = periodo(desde, hasta, agrupacion);
        DashboardResumenDTO kpis = dashboardAnalyticsService.resumen(periodo);
        SerieTemporalDTO serie = ventasAnalyticsService.serie(periodo);
        return ReporteVentasResumenDTO.builder().kpis(kpis).serie(serie).build();
    }

    @Transactional(readOnly = true)
    public byte[] exportarVentasCsv(LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion) {
        ReporteVentasResumenDTO reporte = resumenVentas(desde, hasta, agrupacion);
        return csvExportService.toCsv(out -> escribirVentas(out, reporte));
    }

    @Transactional(readOnly = true)
    public CompraAnalyticsDTO resumenCompras(
            LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion, Long proveedorId) {
        CompraAnalyticsDTO raw = comprasAnalyticsService.analytics(
            periodo(desde, hasta, agrupacion), proveedorId);
        // Analytics filtra solo gastoPorProveedor; KPIs/serie/productos quedan globales.
        // Con filtro activo, Reportes realinea KPIs a la misma fuente que el detalle.
        if (proveedorId == null) {
            return raw;
        }
        return alinearKpisComprasConDetalleProveedor(raw);
    }

    /**
     * Regla de oro Reportes: KPI superior = suma del detalle visible.
     * No inventa fórmulas: agrega filas ya calculadas por Analytics.
     */
    private CompraAnalyticsDTO alinearKpisComprasConDetalleProveedor(CompraAnalyticsDTO raw) {
        List<ProveedorGastoDTO> detalle = raw.getGastoPorProveedor() != null
            ? raw.getGastoPorProveedor()
            : List.of();

        BigDecimal brutas = detalle.stream()
            .map(p -> CalculoAnalytics.nvl(p.getComprasBrutas()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal devoluciones = detalle.stream()
            .map(p -> CalculoAnalytics.nvl(p.getDevoluciones()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        long ordenes = detalle.stream().mapToLong(ProveedorGastoDTO::getOrdenes).sum();

        List<ProveedorGastoDTO> detalleAlineado = detalle.stream()
            .map(p -> ProveedorGastoDTO.builder()
                .proveedorId(p.getProveedorId())
                .nombre(p.getNombre())
                .comprasBrutas(p.getComprasBrutas())
                .devoluciones(p.getDevoluciones())
                .comprasNetas(p.getComprasNetas())
                .ordenes(p.getOrdenes())
                .participacion(CalculoAnalytics.porcentaje(p.getComprasBrutas(), brutas))
                .build())
            .toList();

        return CompraAnalyticsDTO.builder()
            .periodo(raw.getPeriodo())
            .comprasBrutas(CalculoAnalytics.dinero(brutas))
            .devolucionesCompra(CalculoAnalytics.dinero(devoluciones))
            .comprasNetas(CalculoAnalytics.dinero(brutas.subtract(devoluciones)))
            .ordenes(ordenes)
            .gastoPorProveedor(detalleAlineado)
            // producto/serie no tienen filtro por proveedor en Analytics → omitir para no mentir
            .productosComprados(List.of())
            .serie(List.of())
            .estado(ordenes > 0 || devoluciones.signum() != 0
                ? EstadoMetrica.OK
                : EstadoMetrica.SIN_DATOS)
            .build();
    }

    @Transactional(readOnly = true)
    public byte[] exportarComprasCsv(
            LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion, Long proveedorId) {
        CompraAnalyticsDTO reporte = resumenCompras(desde, hasta, agrupacion, proveedorId);
        return csvExportService.toCsv(out -> escribirCompras(out, reporte));
    }

    @Transactional(readOnly = true)
    public ReporteInventarioResumenDTO resumenInventario(
            LocalDateTime desde,
            LocalDateTime hasta,
            Integer umbralStockCritico,
            CriterioRanking criterioAbc,
            boolean incluirAbc) {

        PeriodoAnalitico periodo = periodo(desde, hasta, null);
        InventarioKpiDTO kpis = inventarioAnalyticsService.kpis(periodo, umbralStockCritico);
        AnalisisABCDTO abc = null;
        if (incluirAbc) {
            abc = productoAnalyticsService.analisisABC(
                periodo, criterioAbc != null ? criterioAbc : CriterioRanking.INGRESOS);
        }
        return ReporteInventarioResumenDTO.builder().kpis(kpis).abc(abc).build();
    }

    @Transactional(readOnly = true)
    public byte[] exportarInventarioCsv(
            LocalDateTime desde,
            LocalDateTime hasta,
            Integer umbralStockCritico,
            CriterioRanking criterioAbc,
            boolean incluirAbc) {

        ReporteInventarioResumenDTO reporte =
            resumenInventario(desde, hasta, umbralStockCritico, criterioAbc, incluirAbc);
        return csvExportService.toCsv(out -> escribirInventario(out, reporte));
    }

    private void escribirVentas(PrintWriter out, ReporteVentasResumenDTO reporte) {
        DashboardResumenDTO kpis = reporte.getKpis();
        csvExportService.writeRow(out, "seccion", "metrica", "valor", "estado");
        if (kpis != null) {
            csvExportService.writeRow(out, "kpi", "ventasBrutas", csvExportService.cell(kpis.getVentasBrutas()), csvExportService.cell(kpis.getEstadoVentas()));
            csvExportService.writeRow(out, "kpi", "devoluciones", csvExportService.cell(kpis.getDevoluciones()), "");
            csvExportService.writeRow(out, "kpi", "ventasNetas", csvExportService.cell(kpis.getVentasNetas()), csvExportService.cell(kpis.getEstadoVentas()));
            csvExportService.writeRow(out, "kpi", "costoVentas", csvExportService.cell(kpis.getCostoVentas()), "");
            csvExportService.writeRow(out, "kpi", "gananciaBruta", csvExportService.cell(kpis.getGananciaBruta()), csvExportService.cell(kpis.getEstadoGanancia()));
            csvExportService.writeRow(out, "kpi", "margenBruto", csvExportService.cell(kpis.getMargenBruto()), csvExportService.cell(kpis.getEstadoMargen()));
            csvExportService.writeRow(out, "kpi", "pedidos", csvExportService.cell(kpis.getPedidos()), "");
            csvExportService.writeRow(out, "kpi", "ticketPromedio", csvExportService.cell(kpis.getTicketPromedio()), csvExportService.cell(kpis.getEstadoTicket()));
        }
        out.println();
        csvExportService.writeRow(out,
            "fecha", "etiqueta", "ventas", "devoluciones", "ventasNetas", "ganancia", "pedidos");
        SerieTemporalDTO serie = reporte.getSerie();
        List<VentasSerieDTO> puntos = serie != null ? serie.getPuntos() : null;
        if (puntos != null) {
            for (VentasSerieDTO p : puntos) {
                csvExportService.writeRow(out,
                    csvExportService.cell(p.getFecha()),
                    csvExportService.cell(p.getEtiqueta()),
                    csvExportService.cell(p.getVentas()),
                    csvExportService.cell(p.getDevoluciones()),
                    csvExportService.cell(p.getVentasNetas()),
                    csvExportService.cell(p.getGanancia()),
                    csvExportService.cell(p.getPedidos()));
            }
        }
    }

    private void escribirCompras(PrintWriter out, CompraAnalyticsDTO reporte) {
        csvExportService.writeRow(out, "seccion", "metrica", "valor", "estado");
        if (reporte != null) {
            csvExportService.writeRow(out, "kpi", "comprasBrutas", csvExportService.cell(reporte.getComprasBrutas()), csvExportService.cell(reporte.getEstado()));
            csvExportService.writeRow(out, "kpi", "devolucionesCompra", csvExportService.cell(reporte.getDevolucionesCompra()), "");
            csvExportService.writeRow(out, "kpi", "comprasNetas", csvExportService.cell(reporte.getComprasNetas()), "");
            csvExportService.writeRow(out, "kpi", "ordenes", csvExportService.cell(reporte.getOrdenes()), "");
            out.println();
            csvExportService.writeRow(out,
                "proveedorId", "nombre", "comprasBrutas", "devoluciones", "comprasNetas", "ordenes", "participacion");
            if (reporte.getGastoPorProveedor() != null) {
                for (ProveedorGastoDTO p : reporte.getGastoPorProveedor()) {
                    csvExportService.writeRow(out,
                        csvExportService.cell(p.getProveedorId()),
                        csvExportService.cell(p.getNombre()),
                        csvExportService.cell(p.getComprasBrutas()),
                        csvExportService.cell(p.getDevoluciones()),
                        csvExportService.cell(p.getComprasNetas()),
                        csvExportService.cell(p.getOrdenes()),
                        csvExportService.cell(p.getParticipacion()));
                }
            }
            out.println();
            csvExportService.writeRow(out,
                "productoId", "nombre", "unidades", "unidadesDevueltas", "costoCompras", "costoDevuelto", "costoNeto");
            if (reporte.getProductosComprados() != null) {
                for (ProductoCompradoDTO p : reporte.getProductosComprados()) {
                    csvExportService.writeRow(out,
                        csvExportService.cell(p.getProductoId()),
                        csvExportService.cell(p.getNombre()),
                        csvExportService.cell(p.getUnidades()),
                        csvExportService.cell(p.getUnidadesDevueltas()),
                        csvExportService.cell(p.getCostoCompras()),
                        csvExportService.cell(p.getCostoDevuelto()),
                        csvExportService.cell(p.getCostoNeto()));
                }
            }
        }
    }

    private void escribirInventario(PrintWriter out, ReporteInventarioResumenDTO reporte) {
        InventarioKpiDTO kpis = reporte.getKpis();
        csvExportService.writeRow(out, "seccion", "metrica", "valor", "estado");
        if (kpis != null) {
            csvExportService.writeRow(out, "kpi", "stockTotal", csvExportService.cell(kpis.getStockTotal()), "");
            csvExportService.writeRow(out, "kpi", "valorInventario", csvExportService.cell(kpis.getValorInventario()), csvExportService.cell(kpis.getEstadoValorInventario()));
            csvExportService.writeRow(out, "kpi", "stockInicial", csvExportService.cell(kpis.getStockInicial()), "");
            csvExportService.writeRow(out, "kpi", "stockFinal", csvExportService.cell(kpis.getStockFinal()), "");
            csvExportService.writeRow(out, "kpi", "inventarioDisponible", csvExportService.cell(kpis.getInventarioDisponible()), "");
            csvExportService.writeRow(out, "kpi", "unidadesVendidas", csvExportService.cell(kpis.getUnidadesVendidas()), "");
            csvExportService.writeRow(out, "kpi", "inventoryTurnover", csvExportService.cell(kpis.getInventoryTurnover()), csvExportService.cell(kpis.getEstadoTurnover()));
            csvExportService.writeRow(out, "kpi", "sellThrough", csvExportService.cell(kpis.getSellThrough()), csvExportService.cell(kpis.getEstadoSellThrough()));
            csvExportService.writeRow(out, "kpi", "diasInventario", csvExportService.cell(kpis.getDiasInventario()), csvExportService.cell(kpis.getEstadoDiasInventario()));
            csvExportService.writeRow(out, "kpi", "productosStockCritico", csvExportService.cell(kpis.getProductosStockCritico()), "");
        }
        AnalisisABCDTO abc = reporte.getAbc();
        if (abc != null && abc.getProductos() != null) {
            out.println();
            csvExportService.writeRow(out,
                "productoId", "nombre", "categoriaCodigo", "ingresos", "participacion", "participacionAcumulada", "clasificacion");
            abc.getProductos().forEach(p -> csvExportService.writeRow(out,
                csvExportService.cell(p.getProductoId()),
                csvExportService.cell(p.getNombre()),
                csvExportService.cell(p.getCategoriaCodigo()),
                csvExportService.cell(p.getIngresos()),
                csvExportService.cell(p.getParticipacion()),
                csvExportService.cell(p.getParticipacionAcumulada()),
                csvExportService.cell(p.getClasificacion())));
        }
    }

    private PeriodoAnalitico periodo(LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion) {
        return PeriodoAnalitico.resolver(desde, hasta, agrupacion, ZoneId.of(zonaHoraria));
    }
}
