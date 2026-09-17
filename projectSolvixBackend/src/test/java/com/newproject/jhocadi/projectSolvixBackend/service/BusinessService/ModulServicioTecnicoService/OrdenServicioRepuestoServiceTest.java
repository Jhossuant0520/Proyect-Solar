package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarDiagnosticoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsumirRepuestoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DevolverRepuestoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoRepuestoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class OrdenServicioRepuestoServiceTest extends ComercialTestSupport {

    @Autowired
    private OrdenServicioRepuestoService repuestoService;

    @Autowired
    private OrdenServicioService ordenServicioService;

    @Autowired
    private EquipoService equipoService;

    @Test
    @DisplayName("planificar crea línea sin modificar stock")
    void planificarSinMovimiento() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        Producto producto = crearProducto("SSD 500", bd("200000"), bd("180000"), 5);
        int stockAntes = stockDe(producto.getId());

        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 3);

        assertThat(linea.getEstado()).isEqualTo(EstadoRepuestoOrdenServicio.PLANIFICADO);
        assertThat(linea.getCantidadPlanificada()).isEqualTo(3);
        assertThat(linea.getCantidadConsumida()).isZero();
        assertThat(linea.getCantidadPendiente()).isEqualTo(3);
        assertThat(linea.getCostoHistorico()).isNull();
        assertThat(stockDe(producto.getId())).isEqualTo(stockAntes);
        assertThat(movimientoRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("rechaza cantidad planificada inválida y producto inexistente")
    void planificarValidaciones() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        RepuestoOrdenServicioRequestDTO sinProducto = new RepuestoOrdenServicioRequestDTO();
        sinProducto.setCantidadPlanificada(1);
        assertThatThrownBy(() -> repuestoService.planificar(orden.getId(), sinProducto))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("producto");

        RepuestoOrdenServicioRequestDTO productoInexistente = new RepuestoOrdenServicioRequestDTO();
        productoInexistente.setProductoId(999_999L);
        productoInexistente.setCantidadPlanificada(1);
        assertThatThrownBy(() -> repuestoService.planificar(orden.getId(), productoInexistente))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("no existe");
    }

    @Test
    @DisplayName("no consumir en RECEPCIONADO; sí en EN_REPARACION")
    void consumoSoloEnReparacion() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        Producto producto = crearProducto("Fan", bd("30000"), bd("10000"), 4);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 1);

        assertThatThrownBy(() -> consumir(orden.getId(), linea.getId(), 1))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("No se puede consumir");

        OrdenServicioResponseDTO enReparacion = avanzarAReparacion(orden);
        RepuestoOrdenServicioResponseDTO consumida = consumir(enReparacion.getId(), linea.getId(), 1);
        assertThat(consumida.getCantidadConsumida()).isEqualTo(1);
        assertThat(stockDe(producto.getId())).isEqualTo(3);
    }

    @Test
    @DisplayName("edita planificada y no permite bajar por debajo del consumo neto")
    void editarPlanificada() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("RAM", bd("100000"), bd("50000"), 10);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 3);
        consumir(orden.getId(), linea.getId(), 2);

        RepuestoOrdenServicioRequestDTO ok = request(producto.getId(), 4);
        assertThat(repuestoService.actualizarPlanificacion(orden.getId(), linea.getId(), ok)
            .getCantidadPlanificada()).isEqualTo(4);

        RepuestoOrdenServicioRequestDTO bajo = request(producto.getId(), 1);
        assertThatThrownBy(() ->
            repuestoService.actualizarPlanificacion(orden.getId(), linea.getId(), bajo))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("consumo neto");
    }

    @Test
    @DisplayName("consumo parcial y completo con CONSUMO_SERVICIO y referencia ORDEN_SERVICIO")
    void consumoParcialYCompleto() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("SSD", bd("200000"), bd("180000"), 5);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 3);

        RepuestoOrdenServicioResponseDTO parcial = consumir(orden.getId(), linea.getId(), 2);
        assertThat(parcial.getEstado()).isEqualTo(EstadoRepuestoOrdenServicio.PARCIAL);
        assertThat(parcial.getCantidadConsumida()).isEqualTo(2);
        assertThat(parcial.getCantidadNetaConsumida()).isEqualTo(2);
        assertThat(parcial.getCantidadPendiente()).isEqualTo(1);
        assertThat(parcial.getCostoHistorico()).isEqualByComparingTo("180000");
        assertThat(parcial.isCostoConocido()).isTrue();
        assertThat(stockDe(producto.getId())).isEqualTo(3);

        RepuestoOrdenServicioResponseDTO completo = consumir(orden.getId(), linea.getId(), 1);
        assertThat(completo.getEstado()).isEqualTo(EstadoRepuestoOrdenServicio.CONSUMIDO);
        assertThat(stockDe(producto.getId())).isEqualTo(2);

        List<MovimientoInventario> movimientos = movimientoRepository.findAll().stream()
            .filter(m -> m.getTipo() == TipoMovimientoInventario.CONSUMO_SERVICIO)
            .toList();
        assertThat(movimientos).hasSize(2);
        assertThat(movimientos.get(0).getReferenciaTipo()).isEqualTo(ReferenciaMovimiento.ORDEN_SERVICIO);
        assertThat(movimientos.get(0).getReferenciaId()).isEqualTo(orden.getId());
    }

    @Test
    @DisplayName("devolver aumenta stock; permite reconsumir unidades devueltas")
    void devolucionYReconsumo() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("Pantalla", bd("400000"), bd("250000"), 3);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 2);
        consumir(orden.getId(), linea.getId(), 2);
        assertThat(stockDe(producto.getId())).isEqualTo(1);

        RepuestoOrdenServicioResponseDTO devuelta = devolver(orden.getId(), linea.getId(), 1);
        assertThat(devuelta.getCantidadDevuelta()).isEqualTo(1);
        assertThat(devuelta.getCantidadNetaConsumida()).isEqualTo(1);
        assertThat(devuelta.getCantidadPendiente()).isEqualTo(1);
        assertThat(stockDe(producto.getId())).isEqualTo(2);

        RepuestoOrdenServicioResponseDTO reconsumo = consumir(orden.getId(), linea.getId(), 1);
        assertThat(reconsumo.getCantidadNetaConsumida()).isEqualTo(2);
        assertThat(reconsumo.getEstado()).isEqualTo(EstadoRepuestoOrdenServicio.CONSUMIDO);
        assertThat(stockDe(producto.getId())).isEqualTo(1);

        assertThat(movimientoRepository.findAll().stream()
            .anyMatch(m -> m.getTipo() == TipoMovimientoInventario.DEVOLUCION_SERVICIO)).isTrue();
    }

    @Test
    @DisplayName("congela costo null y no permite sobreconsumo ni sobredevolución")
    void costoNullYLimites() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("SinCosto", bd("10000"), null, 5);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 2);

        RepuestoOrdenServicioResponseDTO consumida = consumir(orden.getId(), linea.getId(), 1);
        assertThat(consumida.getCostoHistorico()).isNull();
        assertThat(consumida.isCostoConocido()).isFalse();

        assertThatThrownBy(() -> consumir(orden.getId(), linea.getId(), 5))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("planificada");

        assertThatThrownBy(() -> devolver(orden.getId(), linea.getId(), 3))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("consumido");
    }

    @Test
    @DisplayName("anular sin consumo; no anular con neta")
    void anularLinea() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("Teclado", bd("50000"), bd("20000"), 3);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 1);

        RepuestoOrdenServicioResponseDTO anulada = repuestoService.anular(orden.getId(), linea.getId());
        assertThat(anulada.getEstado()).isEqualTo(EstadoRepuestoOrdenServicio.ANULADO);

        RepuestoOrdenServicioResponseDTO conConsumo = planificar(orden.getId(), producto.getId(), 1);
        consumir(orden.getId(), conConsumo.getId(), 1);
        assertThatThrownBy(() -> repuestoService.anular(orden.getId(), conConsumo.getId()))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("consumo neto");
    }

    @Test
    @DisplayName("ESPERA_REPUESTO exige línea pendiente; cancelación respeta consumo neto")
    void esperaYCancelacion() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());

        CambiarEstadoOrdenServicioRequestDTO aEspera = cambio(EstadoOrdenServicio.ESPERA_REPUESTO, "Sin piezas");
        assertThatThrownBy(() -> ordenServicioService.cambiarEstado(orden.getId(), aEspera, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("repuestos pendientes");

        Producto producto = crearProducto("Board", bd("100000"), bd("60000"), 2);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 1);
        assertThat(ordenServicioService.cambiarEstado(orden.getId(), aEspera, USUARIO_TEST)
            .getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.ESPERA_REPUESTO);

        consumir(orden.getId(), linea.getId(), 1);
        assertThat(repuestoService.existeConsumoNetoPendiente(orden.getId())).isTrue();

        // Cancelación no está permitida desde EN_REPARACION/ESPERA; regla de neta sigue vigente.
        CambiarEstadoOrdenServicioRequestDTO cancelar = cambio(EstadoOrdenServicio.CANCELADO, "Cancelar");
        assertThatThrownBy(() -> ordenServicioService.cambiarEstado(orden.getId(), cancelar, USUARIO_TEST))
            .isInstanceOf(BusinessException.class);

        devolver(orden.getId(), linea.getId(), 1);
        assertThat(repuestoService.existeConsumoNetoPendiente(orden.getId())).isFalse();

        OrdenServicioResponseDTO orden2 = crearOrdenBasica();
        planificar(orden2.getId(), producto.getId(), 1);
        assertThat(ordenServicioService.cambiarEstado(
                orden2.getId(), cancelar, USUARIO_TEST).getEstadoNuevo())
            .isEqualTo(EstadoOrdenServicio.CANCELADO);
    }

    @Test
    @DisplayName("producto inactivo: histórico visible; no nueva planificación")
    void productoInactivoHistorico() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("Legacy", bd("10000"), bd("5000"), 2);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 1);
        consumir(orden.getId(), linea.getId(), 1);

        producto.setActivo(false);
        productoRepository.save(producto);

        RepuestoOrdenServicioResponseDTO historica = repuestoService.listar(orden.getId()).get(0);
        assertThat(historica.getProductoNombre()).isEqualTo("Legacy");
        assertThat(historica.isProductoActivo()).isFalse();

        assertThatThrownBy(() -> planificar(orden.getId(), producto.getId(), 1))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("inactivo");
    }

    @Test
    @DisplayName("planificar con stock 0 ok; consumir falla por InventarioService")
    void planificarSinStock() {
        OrdenServicioResponseDTO orden = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("Agotado", bd("10000"), bd("4000"), 0);
        RepuestoOrdenServicioResponseDTO linea = planificar(orden.getId(), producto.getId(), 1);
        assertThat(linea.getEstado()).isEqualTo(EstadoRepuestoOrdenServicio.PLANIFICADO);
        assertThatThrownBy(() -> consumir(orden.getId(), linea.getId(), 1))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Stock insuficiente");
    }

    @Test
    @DisplayName("línea debe pertenecer a la OT")
    void lineaDeOtraOt() {
        OrdenServicioResponseDTO ordenA = avanzarAReparacion(crearOrdenBasica());
        OrdenServicioResponseDTO ordenB = avanzarAReparacion(crearOrdenBasica());
        Producto producto = crearProducto("Mouse", bd("20000"), bd("8000"), 2);
        RepuestoOrdenServicioResponseDTO linea = planificar(ordenA.getId(), producto.getId(), 1);

        assertThatThrownBy(() -> consumir(ordenB.getId(), linea.getId(), 1))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    private OrdenServicioResponseDTO crearOrdenBasica() {
        Cliente cliente = crearCliente("Cliente OT repuesto " + System.nanoTime());
        EquipoRequestDTO equipoReq = new EquipoRequestDTO();
        equipoReq.setClienteId(cliente.getId());
        equipoReq.setTipoEquipo(TipoEquipo.PORTATIL);
        EquipoResponseDTO equipo = equipoService.crear(equipoReq);
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        return ordenServicioService.crear(request, USUARIO_TEST);
    }

    private OrdenServicioResponseDTO avanzarAReparacion(OrdenServicioResponseDTO orden) {
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_DIAGNOSTICO, "inicio"), USUARIO_TEST);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Falla confirmada");
        ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST);
        OrdenServicioRequestDTO textos = new OrdenServicioRequestDTO();
        textos.setClienteId(orden.getClienteId());
        textos.setEquipoId(orden.getEquipoId());
        textos.setDiagnostico("Falla confirmada");
        textos.setTrabajoRealizado("En curso");
        ordenServicioService.actualizar(orden.getId(), textos);
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.COTIZADO, "cotiza"), USUARIO_TEST);
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.APROBADO, "aprueba"), USUARIO_TEST);
        return ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_REPARACION, "repara"), USUARIO_TEST)
            .getOrden();
    }

    private CambiarEstadoOrdenServicioRequestDTO cambio(EstadoOrdenServicio estado, String motivo) {
        CambiarEstadoOrdenServicioRequestDTO dto = new CambiarEstadoOrdenServicioRequestDTO();
        dto.setNuevoEstado(estado);
        dto.setMotivo(motivo);
        return dto;
    }

    private RepuestoOrdenServicioResponseDTO planificar(Long ordenId, Long productoId, int cantidad) {
        return repuestoService.planificar(ordenId, request(productoId, cantidad));
    }

    private RepuestoOrdenServicioResponseDTO consumir(Long ordenId, Long repuestoId, int cantidad) {
        ConsumirRepuestoRequestDTO body = new ConsumirRepuestoRequestDTO();
        body.setCantidad(cantidad);
        return repuestoService.consumir(ordenId, repuestoId, body, USUARIO_TEST);
    }

    private RepuestoOrdenServicioResponseDTO devolver(Long ordenId, Long repuestoId, int cantidad) {
        DevolverRepuestoRequestDTO body = new DevolverRepuestoRequestDTO();
        body.setCantidad(cantidad);
        return repuestoService.devolver(ordenId, repuestoId, body, USUARIO_TEST);
    }

    private RepuestoOrdenServicioRequestDTO request(Long productoId, int cantidad) {
        RepuestoOrdenServicioRequestDTO request = new RepuestoOrdenServicioRequestDTO();
        request.setProductoId(productoId);
        request.setCantidadPlanificada(cantidad);
        return request;
    }

    private static BigDecimal bd(String value) {
        return value == null ? null : new BigDecimal(value);
    }
}
