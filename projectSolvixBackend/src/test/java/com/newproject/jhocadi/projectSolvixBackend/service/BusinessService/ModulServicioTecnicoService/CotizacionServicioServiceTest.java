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
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DetalleCotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarNuevaFallaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RechazarCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ResumenEconomicoOrdenServicioDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class CotizacionServicioServiceTest extends ComercialTestSupport {

    @Autowired
    private CotizacionServicioService cotizacionService;

    @Autowired
    private OrdenServicioService ordenServicioService;

    @Autowired
    private OrdenServicioRepuestoService repuestoService;

    @Autowired
    private EquipoService equipoService;

    @Test
    @DisplayName("crear inicial solo en DIAGNOSTICADO; no antes")
    void crearInicialSoloDiagnosticado() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        CotizacionServicioRequestDTO body = requestConManoObra("Diagnóstico", "1", "50000");

        assertThatThrownBy(() -> cotizacionService.crearInicial(orden.getId(), body, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("DIAGNOSTICADO");

        OrdenServicioResponseDTO diagnosticado = avanzarADiagnosticado(orden);
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            diagnosticado.getId(), body, USUARIO_TEST);

        assertThat(cot.getTipo()).isEqualTo(TipoCotizacionServicio.INICIAL);
        assertThat(cot.getEstado()).isEqualTo(EstadoCotizacionServicio.BORRADOR);
        assertThat(cot.getNumero()).startsWith("COT-");
        assertThat(ordenServicioService.obtenerPorId(diagnosticado.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.COTIZADO);
    }

    @Test
    @DisplayName("no permite cotización vacía ni precios/cantidades inválidos")
    void validacionesMonetariasYVacias() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());

        CotizacionServicioRequestDTO vacia = new CotizacionServicioRequestDTO();
        vacia.setDetalles(List.of());
        assertThatThrownBy(() -> cotizacionService.crearInicial(orden.getId(), vacia, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("al menos una línea");

        DetalleCotizacionServicioRequestDTO cantidadCero = linea(
            TipoDetalleCotizacionServicio.MANO_OBRA, "X", "0", "10000");
        CotizacionServicioRequestDTO reqCant = new CotizacionServicioRequestDTO();
        reqCant.setDetalles(List.of(cantidadCero));
        assertThatThrownBy(() -> cotizacionService.crearInicial(orden.getId(), reqCant, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("cantidad");

        DetalleCotizacionServicioRequestDTO precioNeg = linea(
            TipoDetalleCotizacionServicio.MANO_OBRA, "X", "1", "-10");
        CotizacionServicioRequestDTO reqPrecio = new CotizacionServicioRequestDTO();
        reqPrecio.setDetalles(List.of(precioNeg));
        assertThatThrownBy(() -> cotizacionService.crearInicial(orden.getId(), reqPrecio, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("negativo");
    }

    @Test
    @DisplayName("repuesto planificado, mano de obra y otro; stock y precio producto intactos")
    void lineasYSeparacionInventario() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_DIAGNOSTICO), USUARIO_TEST);
        Producto producto = crearProducto("Fuente 19V", bd("80000"), bd("45000"), 5);
        int stockAntes = stockDe(producto.getId());
        BigDecimal precioAntes = producto.getPrecioVentaActual();
        BigDecimal costoAntes = producto.getCostoActual();

        RepuestoOrdenServicioResponseDTO repuesto = planificar(orden.getId(), producto.getId(), 2);

        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Fuente dañada");
        ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST);

        DetalleCotizacionServicioRequestDTO lineaRepuesto = new DetalleCotizacionServicioRequestDTO();
        lineaRepuesto.setTipo(TipoDetalleCotizacionServicio.REPUESTO);
        lineaRepuesto.setOrdenServicioRepuestoId(repuesto.getId());
        lineaRepuesto.setCantidad(bd("1"));
        lineaRepuesto.setPrecioUnitario(bd("75000"));

        CotizacionServicioRequestDTO body = new CotizacionServicioRequestDTO();
        body.setDetalles(List.of(
            lineaRepuesto,
            linea(TipoDetalleCotizacionServicio.MANO_OBRA, "Reparación de fuente", "1", "50000"),
            linea(TipoDetalleCotizacionServicio.OTRO, "Transporte", "1", "10000")
        ));

        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), body, USUARIO_TEST);

        assertThat(cot.getSubtotalRepuestos()).isEqualByComparingTo("75000.00");
        assertThat(cot.getSubtotalManoObra()).isEqualByComparingTo("50000.00");
        assertThat(cot.getSubtotalOtros()).isEqualByComparingTo("10000.00");
        assertThat(cot.getTotal()).isEqualByComparingTo("135000.00");
        assertThat(stockDe(producto.getId())).isEqualTo(stockAntes);
        assertThat(movimientoRepository.findAll()).isEmpty();
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getPrecioVentaActual())
            .isEqualByComparingTo(precioAntes);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getCostoActual())
            .isEqualByComparingTo(costoAntes);
    }

    @Test
    @DisplayName("presentar pasa cotización y OT a PENDIENTE_APROBACION")
    void presentarCotizacion() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("MO", "1", "100000"), USUARIO_TEST);

        CotizacionServicioResponseDTO presentada = cotizacionService.presentar(
            orden.getId(), cot.getId(), USUARIO_TEST);

        assertThat(presentada.getEstado()).isEqualTo(EstadoCotizacionServicio.PENDIENTE_APROBACION);
        assertThat(presentada.getFechaPresentacion()).isNotNull();
        assertThat(presentada.getUsuarioPresentacion()).isEqualTo(USUARIO_TEST);
        assertThat(presentada.isPuedeEditar()).isTrue();
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.PENDIENTE_APROBACION);
    }

    @Test
    @DisplayName("editar cotización presentada: misma cotización vuelve a BORRADOR y se re-presenta")
    void editarPresentadaSinCrearVersiones() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("Reparación", "1", "300000"), USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);

        CotizacionServicioRequestDTO edit = new CotizacionServicioRequestDTO();
        edit.setDetalles(List.of(
            linea(TipoDetalleCotizacionServicio.MANO_OBRA, "Reparación", "1", "300000"),
            linea(TipoDetalleCotizacionServicio.OTRO, "Insumos", "1", "120000")));
        CotizacionServicioResponseDTO editada = cotizacionService.actualizar(
            orden.getId(), cot.getId(), edit, USUARIO_TEST);

        assertThat(editada.getId()).isEqualTo(cot.getId());
        assertThat(editada.getNumero()).isEqualTo(cot.getNumero());
        assertThat(editada.getEstado()).isEqualTo(EstadoCotizacionServicio.BORRADOR);
        assertThat(editada.getFechaPresentacion()).isNull();
        assertThat(editada.getTotal()).isEqualByComparingTo("420000.00");
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.COTIZADO);

        CotizacionServicioResponseDTO represented = cotizacionService.presentar(
            orden.getId(), cot.getId(), USUARIO_TEST);
        assertThat(represented.getEstado()).isEqualTo(EstadoCotizacionServicio.PENDIENTE_APROBACION);
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.PENDIENTE_APROBACION);
        assertThat(cotizacionService.listar(orden.getId())).hasSize(1);
    }

    @Test
    @DisplayName("PUT agrega, edita y elimina líneas sobre la misma cotización y recalcula total")
    void putAgregaEditaEliminaLineas() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioRequestDTO inicial = new CotizacionServicioRequestDTO();
        inicial.setDetalles(List.of(
            linea(TipoDetalleCotizacionServicio.MANO_OBRA, "Diagnóstico", "1", "50000"),
            linea(TipoDetalleCotizacionServicio.OTRO, "Transporte", "1", "10000")));
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), inicial, USUARIO_TEST);
        assertThat(cot.getTotal()).isEqualByComparingTo("60000.00");

        CotizacionServicioRequestDTO edit = new CotizacionServicioRequestDTO();
        edit.setObservaciones("Incluye limpieza");
        edit.setDetalles(List.of(
            linea(TipoDetalleCotizacionServicio.MANO_OBRA, "Diagnóstico", "2", "40000"),
            linea(TipoDetalleCotizacionServicio.MANO_OBRA, "Limpieza interna", "1", "25000")));
        CotizacionServicioResponseDTO editada = cotizacionService.actualizar(
            orden.getId(), cot.getId(), edit, USUARIO_TEST);

        assertThat(editada.getId()).isEqualTo(cot.getId());
        assertThat(editada.getDetalles()).hasSize(2);
        assertThat(editada.getDetalles())
            .extracting(d -> d.getDescripcion())
            .containsExactly("Diagnóstico", "Limpieza interna");
        assertThat(editada.getDetalles().get(0).getSubtotal()).isEqualByComparingTo("80000.00");
        assertThat(editada.getSubtotalOtros()).isEqualByComparingTo("0.00");
        assertThat(editada.getTotal()).isEqualByComparingTo("105000.00");
        assertThat(editada.getObservaciones()).isEqualTo("Incluye limpieza");
        assertThat(cotizacionService.listar(orden.getId())).hasSize(1);
    }

    @Test
    @DisplayName("repuesto con producto real: precio congelado, stock intacto y sin producto se rechaza")
    void repuestoConProductoReal() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        Producto producto = crearProducto("Tarjeta especial XYZ", bd("180000"), bd("120000"), 1);

        DetalleCotizacionServicioRequestDTO lineaProducto = new DetalleCotizacionServicioRequestDTO();
        lineaProducto.setTipo(TipoDetalleCotizacionServicio.REPUESTO);
        lineaProducto.setProductoId(producto.getId());
        lineaProducto.setCantidad(bd("1"));
        lineaProducto.setPrecioUnitario(bd("250000"));
        CotizacionServicioRequestDTO body = new CotizacionServicioRequestDTO();
        body.setDetalles(List.of(lineaProducto));

        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), body, USUARIO_TEST);

        assertThat(cot.getDetalles().get(0).getProductoId()).isEqualTo(producto.getId());
        assertThat(cot.getDetalles().get(0).getProductoNombreSnapshot()).isEqualTo("Tarjeta especial XYZ");
        assertThat(cot.getDetalles().get(0).getPrecioUnitario()).isEqualByComparingTo("250000.00");
        assertThat(cot.getTotal()).isEqualByComparingTo("250000.00");
        assertThat(stockDe(producto.getId())).isEqualTo(1);

        Producto p = productoRepository.findById(producto.getId()).orElseThrow();
        p.setPrecioVentaActual(bd("999999"));
        productoRepository.save(p);
        assertThat(cotizacionService.obtener(orden.getId(), cot.getId()).getTotal())
            .isEqualByComparingTo("250000.00");

        DetalleCotizacionServicioRequestDTO sinProducto = linea(
            TipoDetalleCotizacionServicio.REPUESTO, "Pantalla genérica", "1", "100000");
        CotizacionServicioRequestDTO invalida = new CotizacionServicioRequestDTO();
        invalida.setDetalles(List.of(sinProducto));
        assertThatThrownBy(() ->
            cotizacionService.actualizar(orden.getId(), cot.getId(), invalida, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("producto");
    }

    @Test
    @DisplayName("aprobar inicial: cotización APROBADA y OT APROBADO")
    void aprobarInicial() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("MO", "1", "130000"), USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);

        CotizacionServicioResponseDTO aprobada = cotizacionService.aprobar(
            orden.getId(), cot.getId(), USUARIO_TEST);

        assertThat(aprobada.getEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(aprobada.getFechaAprobacion()).isNotNull();
        assertThat(aprobada.getUsuarioAprobacion()).isEqualTo(USUARIO_TEST);
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.APROBADO);

        assertThatThrownBy(() ->
            cotizacionService.actualizar(
                orden.getId(), cot.getId(), requestConManoObra("X", "1", "1"), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("aprobada");
        assertThat(cotizacionService.obtener(orden.getId(), cot.getId()).isPuedeEditar()).isFalse();
        assertThat(cotizacionService.obtener(orden.getId(), cot.getId()).getTotal())
            .isEqualByComparingTo("130000.00");
    }

    @Test
    @DisplayName("rechazar no modifica cotización rechazada y permite nueva propuesta")
    void rechazarYNuevaPropuesta() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("MO", "1", "90000"), USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);

        RechazarCotizacionRequestDTO rechazo = new RechazarCotizacionRequestDTO();
        rechazo.setObservacion("Cliente pidió otro valor");
        CotizacionServicioResponseDTO rechazada = cotizacionService.rechazar(
            orden.getId(), cot.getId(), rechazo, USUARIO_TEST);

        assertThat(rechazada.getEstado()).isEqualTo(EstadoCotizacionServicio.RECHAZADA);
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.COTIZADO);

        CotizacionServicioResponseDTO nueva = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("MO nueva", "1", "80000"), USUARIO_TEST);
        assertThat(nueva.getEstado()).isEqualTo(EstadoCotizacionServicio.BORRADOR);
        assertThat(cotizacionService.listar(orden.getId())).hasSize(2);
    }

    @Test
    @DisplayName("adicional tras nueva falla; aprobar vuelve a EN_REPARACION; inicial intacta")
    void cotizacionAdicionalFlujo() {
        OrdenServicioResponseDTO orden = avanzarAReparacionConCotizacion();
        CotizacionServicioResponseDTO inicial = cotizacionService.listar(orden.getId()).get(0);
        BigDecimal totalInicial = inicial.getTotal();

        RegistrarNuevaFallaRequestDTO falla = new RegistrarNuevaFallaRequestDTO();
        falla.setNuevaFalla("Daño adicional en tarjeta");
        ordenServicioService.registrarNuevaFalla(orden.getId(), falla, USUARIO_TEST);
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL);

        assertThatThrownBy(() -> ordenServicioService.cambiarEstado(
            orden.getId(),
            cambio(EstadoOrdenServicio.EN_REPARACION),
            USUARIO_TEST))
            .isInstanceOf(BusinessException.class);

        CotizacionServicioRequestDTO adicionalReq = requestConManoObra("Reparación tarjeta", "1", "70000");
        adicionalReq.setMotivoAmpliacion("Daño adicional en tarjeta");
        CotizacionServicioResponseDTO adicional = cotizacionService.crearAdicional(
            orden.getId(), adicionalReq, USUARIO_TEST);
        assertThat(adicional.getTipo()).isEqualTo(TipoCotizacionServicio.ADICIONAL);

        cotizacionService.presentar(orden.getId(), adicional.getId(), USUARIO_TEST);
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.PENDIENTE_APROBACION);

        cotizacionService.aprobar(orden.getId(), adicional.getId(), USUARIO_TEST);
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.EN_REPARACION);

        CotizacionServicioResponseDTO inicialTras = cotizacionService.obtener(orden.getId(), inicial.getId());
        assertThat(inicialTras.getEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(inicialTras.getTotal()).isEqualByComparingTo(totalInicial);

        ResumenEconomicoOrdenServicioDTO resumen = cotizacionService.resumenEconomico(orden.getId());
        assertThat(resumen.getTotalAutorizado()).isEqualByComparingTo("200000.00");
    }

    @Test
    @DisplayName("editar adicional presentada vuelve OT a REQUIERE_APROBACION_ADICIONAL")
    void editarAdicionalPresentada() {
        OrdenServicioResponseDTO orden = avanzarAReparacionConCotizacion();
        RegistrarNuevaFallaRequestDTO falla = new RegistrarNuevaFallaRequestDTO();
        falla.setNuevaFalla("Conector dañado");
        ordenServicioService.registrarNuevaFalla(orden.getId(), falla, USUARIO_TEST);

        CotizacionServicioRequestDTO req = requestConManoObra("Conector", "1", "40000");
        req.setMotivoAmpliacion("Conector dañado");
        CotizacionServicioResponseDTO adicional = cotizacionService.crearAdicional(
            orden.getId(), req, USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), adicional.getId(), USUARIO_TEST);

        CotizacionServicioRequestDTO edit = requestConManoObra("Conector + soldadura", "1", "55000");
        CotizacionServicioResponseDTO editada = cotizacionService.actualizar(
            orden.getId(), adicional.getId(), edit, USUARIO_TEST);

        assertThat(editada.getEstado()).isEqualTo(EstadoCotizacionServicio.BORRADOR);
        assertThat(editada.getMotivoAmpliacion()).isEqualTo("Conector dañado");
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL);

        cotizacionService.presentar(orden.getId(), adicional.getId(), USUARIO_TEST);
        cotizacionService.aprobar(orden.getId(), adicional.getId(), USUARIO_TEST);
        assertThat(cotizacionService.resumenEconomico(orden.getId()).getTotalAutorizado())
            .isEqualByComparingTo("185000.00");
        assertThat(cotizacionService.listar(orden.getId())).hasSize(2);
    }

    @Test
    @DisplayName("snapshot histórico no cambia si producto cambia precio")
    void snapshotHistorico() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_DIAGNOSTICO), USUARIO_TEST);
        Producto producto = crearProducto("SSD", bd("100000"), bd("60000"), 3);
        RepuestoOrdenServicioResponseDTO repuesto = planificar(orden.getId(), producto.getId(), 1);

        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Disco fallido");
        ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST);

        DetalleCotizacionServicioRequestDTO linea = new DetalleCotizacionServicioRequestDTO();
        linea.setTipo(TipoDetalleCotizacionServicio.REPUESTO);
        linea.setOrdenServicioRepuestoId(repuesto.getId());
        linea.setCantidad(bd("1"));

        CotizacionServicioRequestDTO body = new CotizacionServicioRequestDTO();
        body.setDetalles(List.of(linea));
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), body, USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);
        cotizacionService.aprobar(orden.getId(), cot.getId(), USUARIO_TEST);

        Producto p = productoRepository.findById(producto.getId()).orElseThrow();
        p.setPrecioVentaActual(bd("999999"));
        productoRepository.save(p);

        CotizacionServicioResponseDTO historica = cotizacionService.obtener(orden.getId(), cot.getId());
        assertThat(historica.getTotal()).isEqualByComparingTo("100000.00");
        assertThat(historica.getDetalles().get(0).getPrecioUnitario()).isEqualByComparingTo("100000.00");
    }

    @Test
    @DisplayName("cambiarEstado no permite saltos de dominio de cotización")
    void bloqueoCambiarEstadoDominio() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        assertThatThrownBy(() -> ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.COTIZADO), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("cotización");
    }

    @Test
    @DisplayName("múltiples adicionales históricas")
    void multiplesAdicionales() {
        OrdenServicioResponseDTO orden = avanzarAReparacionConCotizacion();

        for (int i = 1; i <= 2; i++) {
            RegistrarNuevaFallaRequestDTO falla = new RegistrarNuevaFallaRequestDTO();
            falla.setNuevaFalla("Falla " + i);
            ordenServicioService.registrarNuevaFalla(orden.getId(), falla, USUARIO_TEST);

            CotizacionServicioRequestDTO req = requestConManoObra("Extra " + i, "1", "10000");
            req.setMotivoAmpliacion("Falla " + i);
            CotizacionServicioResponseDTO ad = cotizacionService.crearAdicional(
                orden.getId(), req, USUARIO_TEST);
            cotizacionService.presentar(orden.getId(), ad.getId(), USUARIO_TEST);
            cotizacionService.aprobar(orden.getId(), ad.getId(), USUARIO_TEST);
        }

        assertThat(cotizacionService.listar(orden.getId())).hasSize(3);
        assertThat(cotizacionService.resumenEconomico(orden.getId()).getTotalAutorizado())
            .isEqualByComparingTo("150000.00");
    }

    private OrdenServicioResponseDTO avanzarAReparacionConCotizacion() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("Inicial", "1", "130000"), USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);
        cotizacionService.aprobar(orden.getId(), cot.getId(), USUARIO_TEST);
        return ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_REPARACION), USUARIO_TEST)
            .getOrden();
    }

    private OrdenServicioResponseDTO avanzarADiagnosticado(OrdenServicioResponseDTO orden) {
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_DIAGNOSTICO), USUARIO_TEST);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Fuente dañada");
        return ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST).getOrden();
    }

    private OrdenServicioResponseDTO crearOrdenBasica() {
        Cliente cliente = crearCliente("Cliente Cot " + System.nanoTime());
        EquipoRequestDTO equipoReq = new EquipoRequestDTO();
        equipoReq.setClienteId(cliente.getId());
        equipoReq.setTipoEquipo(TipoEquipo.PORTATIL);
        EquipoResponseDTO equipo = equipoService.crear(equipoReq);

        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        request.setProblemaReportado("No enciende");
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        return ordenServicioService.crear(request, USUARIO_TEST);
    }

    private RepuestoOrdenServicioResponseDTO planificar(Long ordenId, Long productoId, int cantidad) {
        RepuestoOrdenServicioRequestDTO request = new RepuestoOrdenServicioRequestDTO();
        request.setProductoId(productoId);
        request.setCantidadPlanificada(cantidad);
        return repuestoService.planificar(ordenId, request);
    }

    private CotizacionServicioRequestDTO requestConManoObra(
            String descripcion, String cantidad, String precio) {
        CotizacionServicioRequestDTO request = new CotizacionServicioRequestDTO();
        request.setDetalles(List.of(
            linea(TipoDetalleCotizacionServicio.MANO_OBRA, descripcion, cantidad, precio)));
        return request;
    }

    private DetalleCotizacionServicioRequestDTO linea(
            TipoDetalleCotizacionServicio tipo,
            String descripcion,
            String cantidad,
            String precio) {
        DetalleCotizacionServicioRequestDTO d = new DetalleCotizacionServicioRequestDTO();
        d.setTipo(tipo);
        d.setDescripcion(descripcion);
        d.setCantidad(bd(cantidad));
        d.setPrecioUnitario(bd(precio));
        return d;
    }

    private CambiarEstadoOrdenServicioRequestDTO cambio(EstadoOrdenServicio estado) {
        CambiarEstadoOrdenServicioRequestDTO dto = new CambiarEstadoOrdenServicioRequestDTO();
        dto.setNuevoEstado(estado);
        return dto;
    }

    private static BigDecimal bd(String value) {
        return value == null ? null : new BigDecimal(value);
    }
}
