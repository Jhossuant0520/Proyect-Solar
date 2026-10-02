package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionResponseDTO;
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
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class ConsultaPublicaCotizacionAccionServiceTest extends ComercialTestSupport {

    private static final String USUARIO = "admin-publico-cot";
    private static final String IP = "203.0.113.10";

    @Autowired
    private ConsultaPublicaCotizacionAccionService accionPublica;
    @Autowired
    private CotizacionServicioService cotizacionService;
    @Autowired
    private OrdenServicioService ordenServicioService;
    @Autowired
    private EquipoService equipoService;
    @Autowired
    private OrdenServicioRepository ordenServicioRepository;
    @Autowired
    private PublicActionRateLimiter rateLimiter;
    @Autowired
    private DocumentoOrdenServicioService documentoOrdenServicioService;

    @BeforeEach
    void resetRateLimit() {
        rateLimiter.reset();
    }

    @Test
    @DisplayName("aprobar INICIAL público: identidad OK → OT APROBADO, actor CLIENTE_PUBLICO")
    void aprobarInicialPublico() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = identidad(f.cliente);

        AccionPublicaCotizacionResponseDTO resp =
            accionPublica.aprobar(f.token, req, IP);

        assertThat(resp.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(resp.getOrdenEstado()).isEqualTo(EstadoOrdenServicio.APROBADO);
        assertThat(resp.getCotizacionTipo()).isEqualTo(TipoCotizacionServicio.INICIAL);

        CotizacionServicioResponseDTO adminView =
            cotizacionService.obtener(f.ordenId, f.cotizacionId);
        assertThat(adminView.getUsuarioAprobacion())
            .isEqualTo(ConsultaPublicaCotizacionAccionService.ACTOR_CLIENTE_PUBLICO);
    }

    @Test
    @DisplayName("rechazar INICIAL público → OT COTIZADO")
    void rechazarInicialPublico() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = identidad(f.cliente);
        req.setObservacion("Precio alto");

        AccionPublicaCotizacionResponseDTO resp =
            accionPublica.rechazar(f.token, req, IP);

        assertThat(resp.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.RECHAZADA);
        assertThat(resp.getOrdenEstado()).isEqualTo(EstadoOrdenServicio.COTIZADO);
        CotizacionServicioResponseDTO adminView =
            cotizacionService.obtener(f.ordenId, f.cotizacionId);
        assertThat(adminView.getUsuarioRechazo())
            .isEqualTo(ConsultaPublicaCotizacionAccionService.ACTOR_CLIENTE_PUBLICO);
    }

    @Test
    @DisplayName("aprobar ADICIONAL público → OT EN_REPARACION")
    void aprobarAdicionalPublico() {
        Fixture f = prepararAdicionalPendiente();
        AccionPublicaCotizacionResponseDTO resp =
            accionPublica.aprobar(f.token, identidad(f.cliente), IP);

        assertThat(resp.getCotizacionTipo()).isEqualTo(TipoCotizacionServicio.ADICIONAL);
        assertThat(resp.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(resp.getOrdenEstado()).isEqualTo(EstadoOrdenServicio.EN_REPARACION);
    }

    @Test
    @DisplayName("rechazar ADICIONAL público → OT REQUIERE_APROBACION_ADICIONAL")
    void rechazarAdicionalPublico() {
        Fixture f = prepararAdicionalPendiente();
        AccionPublicaCotizacionResponseDTO resp =
            accionPublica.rechazar(f.token, identidad(f.cliente), IP);

        assertThat(resp.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.RECHAZADA);
        assertThat(resp.getOrdenEstado())
            .isEqualTo(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL);
    }

    @Test
    @DisplayName("documento incorrecto → 403 genérico")
    void documentoIncorrecto() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = identidad(f.cliente);
        req.setNumeroDocumento("9999999999");

        assertThatThrownBy(() -> accionPublica.aprobar(f.token, req, IP))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(rse.getReason()).contains("No pudimos validar");
                assertThat(rse.getReason()).doesNotContainIgnoringCase("documento");
                assertThat(rse.getReason()).doesNotContainIgnoringCase("teléfono");
            });
        assertThat(ordenServicioService.obtenerPorId(f.ordenId).getEstado())
            .isEqualTo(EstadoOrdenServicio.PENDIENTE_APROBACION);
    }

    @Test
    @DisplayName("teléfono incorrecto → 403 genérico")
    void telefonoIncorrecto() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = identidad(f.cliente);
        req.setTelefono("3110000000");

        assertThatThrownBy(() -> accionPublica.rechazar(f.token, req, IP))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    @DisplayName("formatos equivalentes de documento y teléfono aceptados")
    void formatosEquivalentes() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = new AccionPublicaCotizacionRequestDTO();
        String doc = f.cliente.getNumeroDocumento();
        // insertar puntos cada 3 desde la derecha
        req.setNumeroDocumento(conPuntos(doc));
        req.setTelefono("+57 " + f.cliente.getTelefono().substring(0, 3) + " "
            + f.cliente.getTelefono().substring(3, 6) + " "
            + f.cliente.getTelefono().substring(6));

        AccionPublicaCotizacionResponseDTO resp =
            accionPublica.aprobar(f.token, req, IP);
        assertThat(resp.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
    }

    @Test
    @DisplayName("token inexistente → 404")
    void tokenInexistente() {
        AccionPublicaCotizacionRequestDTO req = new AccionPublicaCotizacionRequestDTO();
        req.setNumeroDocumento("123");
        req.setTelefono("3001234567");
        assertThatThrownBy(() -> accionPublica.aprobar("tokengiganteinexistente", req, IP))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @DisplayName("sin cotización pendiente → 404")
    void sinCotizacionPendiente() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        String token = tokenDe(orden.getId());
        AccionPublicaCotizacionRequestDTO req = identidad(
            clienteRepository.findById(orden.getClienteId()).orElseThrow());

        assertThatThrownBy(() -> accionPublica.aprobar(token, req, IP))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @DisplayName("rate limit excedido → 429")
    void rateLimitExcedido() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO bad = identidad(f.cliente);
        bad.setNumeroDocumento("0000000000");

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> accionPublica.aprobar(f.token, bad, IP))
                .isInstanceOf(ResponseStatusException.class);
        }
        assertThatThrownBy(() -> accionPublica.aprobar(f.token, bad, IP))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    @DisplayName("regresión: aprobación ADMIN sigue funcionando")
    void regresionAprobarAdmin() {
        Fixture f = prepararInicialPendiente();
        CotizacionServicioResponseDTO aprobada =
            cotizacionService.aprobar(f.ordenId, f.cotizacionId, USUARIO);
        assertThat(aprobada.getEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(aprobada.getUsuarioAprobacion()).isEqualTo(USUARIO);
        assertThat(ordenServicioService.obtenerPorId(f.ordenId).getEstado())
            .isEqualTo(EstadoOrdenServicio.APROBADO);
    }

    @Test
    @DisplayName("regresión: GET consulta pública OT sigue funcionando")
    void regresionConsultaGet() {
        Fixture f = prepararInicialPendiente();
        var dto = documentoOrdenServicioService.consultaOtPublica(f.token);
        assertThat(dto.getNumero()).isEqualTo(f.ordenNumero);
        assertThat(dto.isCotizacionDisponible()).isTrue();
        var cot = documentoOrdenServicioService.consultaCotizacionOtPublica(f.token);
        assertThat(cot.getTotal()).isNotNull();
    }

    @Test
    @DisplayName("crear OT sin documento/teléfono del cliente falla")
    void crearOtExigeDocumentoYTelefono() {
        Cliente incompleto = clienteRepository.save(
            Cliente.builder()
                .nombre("Sin contacto " + System.nanoTime())
                .tipoCliente(com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoCliente.PERSONA)
                .activo(true)
                .build());
        EquipoRequestDTO equipoReq = new EquipoRequestDTO();
        equipoReq.setClienteId(incompleto.getId());
        equipoReq.setTipoEquipo(TipoEquipo.PORTATIL);
        EquipoResponseDTO equipo = equipoService.crear(equipoReq);

        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(incompleto.getId());
        request.setEquipoId(equipo.getId());
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);

        assertThatThrownBy(() -> ordenServicioService.crear(request, USUARIO))
            .hasMessageContaining("documento");
    }

    private Fixture prepararInicialPendiente() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("Inicial", "1", "100000"), USUARIO);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO);
        Cliente cliente = clienteRepository.findById(orden.getClienteId()).orElseThrow();
        return new Fixture(
            orden.getId(),
            orden.getNumero(),
            cot.getId(),
            tokenDe(orden.getId()),
            cliente);
    }

    private Fixture prepararAdicionalPendiente() {
        OrdenServicioResponseDTO orden = avanzarAReparacionConInicial();
        RegistrarNuevaFallaRequestDTO falla = new RegistrarNuevaFallaRequestDTO();
        falla.setNuevaFalla("Nueva falla detectada");
        ordenServicioService.registrarNuevaFalla(orden.getId(), falla, USUARIO);

        CotizacionServicioRequestDTO adicionalReq =
            requestConManoObra("Adicional", "1", "50000");
        adicionalReq.setMotivoAmpliacion("Nueva falla detectada");
        CotizacionServicioResponseDTO adicional = cotizacionService.crearAdicional(
            orden.getId(), adicionalReq, USUARIO);
        cotizacionService.presentar(orden.getId(), adicional.getId(), USUARIO);
        Cliente cliente = clienteRepository.findById(orden.getClienteId()).orElseThrow();
        return new Fixture(
            orden.getId(),
            orden.getNumero(),
            adicional.getId(),
            tokenDe(orden.getId()),
            cliente);
    }

    private OrdenServicioResponseDTO avanzarAReparacionConInicial() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("Inicial", "1", "130000"), USUARIO);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO);
        cotizacionService.aprobar(orden.getId(), cot.getId(), USUARIO);
        return ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_REPARACION), USUARIO)
            .getOrden();
    }

    private OrdenServicioResponseDTO avanzarADiagnosticado(OrdenServicioResponseDTO orden) {
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_DIAGNOSTICO), USUARIO);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Fuente dañada");
        return ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO).getOrden();
    }

    private OrdenServicioResponseDTO crearOrdenBasica() {
        Cliente cliente = crearCliente("Cliente pub " + System.nanoTime());
        EquipoRequestDTO equipoReq = new EquipoRequestDTO();
        equipoReq.setClienteId(cliente.getId());
        equipoReq.setTipoEquipo(TipoEquipo.PORTATIL);
        EquipoResponseDTO equipo = equipoService.crear(equipoReq);

        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        request.setProblemaReportado("No enciende");
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        return ordenServicioService.crear(request, USUARIO);
    }

    private AccionPublicaCotizacionRequestDTO identidad(Cliente cliente) {
        AccionPublicaCotizacionRequestDTO req = new AccionPublicaCotizacionRequestDTO();
        req.setNumeroDocumento(cliente.getNumeroDocumento());
        req.setTelefono(cliente.getTelefono());
        return req;
    }

    private String tokenDe(Long ordenId) {
        OrdenServicio orden = ordenServicioRepository.findById(ordenId).orElseThrow();
        return orden.getTokenConsulta();
    }

    private CotizacionServicioRequestDTO requestConManoObra(
            String descripcion, String cantidad, String precio) {
        CotizacionServicioRequestDTO request = new CotizacionServicioRequestDTO();
        DetalleCotizacionServicioRequestDTO d = new DetalleCotizacionServicioRequestDTO();
        d.setTipo(TipoDetalleCotizacionServicio.MANO_OBRA);
        d.setDescripcion(descripcion);
        d.setCantidad(new BigDecimal(cantidad));
        d.setPrecioUnitario(new BigDecimal(precio));
        request.setDetalles(List.of(d));
        return request;
    }

    private CambiarEstadoOrdenServicioRequestDTO cambio(EstadoOrdenServicio estado) {
        CambiarEstadoOrdenServicioRequestDTO dto = new CambiarEstadoOrdenServicioRequestDTO();
        dto.setNuevoEstado(estado);
        return dto;
    }

    private static String conPuntos(String digits) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < digits.length(); i++) {
            if (i > 0 && (digits.length() - i) % 3 == 0) {
                sb.append('.');
            }
            sb.append(digits.charAt(i));
        }
        return sb.toString();
    }

    private record Fixture(
        Long ordenId,
        String ordenNumero,
        Long cotizacionId,
        String token,
        Cliente cliente) {}
}
