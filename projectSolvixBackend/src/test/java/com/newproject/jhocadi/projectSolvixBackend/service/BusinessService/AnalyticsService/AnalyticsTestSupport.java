package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionLineaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoAjusteCosto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.CompraService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DevolucionVentaService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.InventarioService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.VentaService;

/**
 * Base de las pruebas de analytics: monta operaciones reales de venta, compra y devolución
 * a través de los servicios de negocio, para que los KPIs se calculen sobre datos que
 * pasaron por las mismas reglas que en producción.
 */
abstract class AnalyticsTestSupport extends ComercialTestSupport {

    @Autowired
    protected VentaService ventaService;

    @Autowired
    protected CompraService compraService;

    @Autowired
    protected DevolucionVentaService devolucionVentaService;

    @Autowired
    protected InventarioService inventarioService;

    /**
     * Producto que ya existía antes del período, con su carga inicial registrada y fechada
     * ayer. Reproduce un producto creado por el flujo normal: su línea de tiempo de costo
     * empieza antes de la ventana analizada, así que el inventario inicial se puede valorar.
     *
     * <p>Se distingue de {@code crearProducto}, que escribe el stock directamente en el
     * repositorio y representa un producto anterior a la migración V4, sin costo histórico.
     */
    protected Producto crearProductoConHistorial(
            String nombre, BigDecimal precio, BigDecimal costo, int stock) {

        Producto producto = crearProducto(nombre, precio, costo, 0);

        if (stock > 0) {
            MovimientoInventario carga =
                inventarioService.registrarCargaInicial(producto, stock, USUARIO_TEST);
            retrocederMovimiento(carga, LocalDate.now().minusDays(1).atStartOfDay());
        }

        return productoRepository.findById(producto.getId()).orElseThrow();
    }

    /** Corrección explícita de costo, la única vía admitida fuera del flujo de compras. */
    protected AjusteCostoResponseDTO ajustarCosto(Producto producto, BigDecimal costoNuevo) {
        AjusteCostoRequestDTO request = new AjusteCostoRequestDTO();
        request.setProductoId(producto.getId());
        request.setCostoNuevo(costoNuevo);
        request.setMotivo(MotivoAjusteCosto.CORRECCION_ERROR);
        request.setObservaciones("Ajuste de prueba.");

        return inventarioService.registrarAjusteCosto(request, USUARIO_TEST);
    }

    private void retrocederMovimiento(MovimientoInventario movimiento, LocalDateTime fecha) {
        MovimientoInventario entidad = movimientoRepository.findById(movimiento.getId()).orElseThrow();
        entidad.setFecha(fecha);
        movimientoRepository.save(entidad);
    }

    /** Período que cubre exactamente el día de hoy, donde caen todas las operaciones de prueba. */
    protected PeriodoAnalitico hoy() {
        return hoy(Agrupacion.DIA);
    }

    protected PeriodoAnalitico hoy(Agrupacion agrupacion) {
        LocalDateTime inicio = LocalDate.now().atStartOfDay();
        return new PeriodoAnalitico(inicio, inicio.plusDays(1).minusNanos(1), agrupacion);
    }

    /** Período pasado sin ninguna operación. */
    protected PeriodoAnalitico periodoVacio() {
        LocalDateTime inicio = LocalDate.now().minusDays(40).atStartOfDay();
        return new PeriodoAnalitico(inicio, inicio.plusDays(5), Agrupacion.DIA);
    }

    /**
     * Período que termina dentro de 60 días. Sirve para evaluar productos cuya antigüedad
     * ya supera el umbral de "producto nuevo" sin tener que falsear su fecha de creación.
     */
    protected PeriodoAnalitico periodoConHistorialSuficiente() {
        LocalDateTime inicio = LocalDate.now().atStartOfDay();
        return new PeriodoAnalitico(inicio, inicio.plusDays(60), Agrupacion.DIA);
    }

    protected Producto crearProductoEnCategoria(
            String nombre, String codigoCategoria, BigDecimal precio, BigDecimal costo, int stock) {

        CategoriaProducto categoria = categoriaRepository.findByCodigoIgnoreCase(codigoCategoria)
            .orElseGet(() -> categoriaRepository.save(CategoriaProducto.builder()
                .codigo(codigoCategoria)
                .nombre(codigoCategoria.charAt(0) + codigoCategoria.substring(1).toLowerCase())
                .activo(true)
                .build()));

        return productoRepository.save(Producto.builder()
            .nombre(nombre)
            .marca("Marca")
            .categoria(categoria)
            .precioVentaActual(precio)
            .costoActual(costo)
            .stockActual(stock)
            .activo(true)
            .build());
    }

    /** Venta completada de un solo producto, al precio vigente del catálogo. */
    protected VentaResponseDTO vender(Producto producto, int cantidad) {
        return vender(List.of(producto), List.of(cantidad));
    }

    protected VentaResponseDTO vender(List<Producto> productos, List<Integer> cantidades) {
        List<DetalleVentaRequestDTO> detalles = new ArrayList<>();

        for (int i = 0; i < productos.size(); i++) {
            DetalleVentaRequestDTO detalle = new DetalleVentaRequestDTO();
            detalle.setProductoId(productos.get(i).getId());
            detalle.setCantidad(cantidades.get(i));
            detalles.add(detalle);
        }

        VentaRequestDTO request = new VentaRequestDTO();
        request.setDetalles(detalles);

        VentaResponseDTO creada = ventaService.crear(request, USUARIO_TEST);
        return ventaService.completar(creada.getId(), USUARIO_TEST);
    }

    protected VentaResponseDTO venderSinCompletar(Producto producto, int cantidad) {
        DetalleVentaRequestDTO detalle = new DetalleVentaRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(cantidad);

        VentaRequestDTO request = new VentaRequestDTO();
        request.setDetalles(List.of(detalle));

        return ventaService.crear(request, USUARIO_TEST);
    }

    protected void devolverVenta(VentaResponseDTO venta, int indiceDetalle, int cantidad) {
        DevolucionLineaDTO linea = new DevolucionLineaDTO();
        linea.setDetalleId(venta.getDetalles().get(indiceDetalle).getId());
        linea.setCantidad(cantidad);

        DevolucionVentaRequestDTO request = new DevolucionVentaRequestDTO();
        request.setLineas(List.of(linea));
        request.setMotivo(MotivoDevolucion.PRODUCTO_DEFECTUOSO);

        devolucionVentaService.registrar(venta.getId(), request, USUARIO_TEST);
    }

    /** Compra completada de un solo producto. */
    protected CompraResponseDTO comprar(Producto producto, int cantidad, BigDecimal costoUnitario) {
        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(producto.getId());
        detalle.setCantidad(cantidad);
        detalle.setCostoUnitario(costoUnitario);

        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(crearProveedor("Proveedor de " + producto.getNombre()).getId());
        request.setDetalles(List.of(detalle));

        CompraResponseDTO creada = compraService.crear(request, USUARIO_TEST);
        return compraService.completar(creada.getId(), USUARIO_TEST);
    }
}
