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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarDiagnosticoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DetalleCotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.HistorialEstadoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarNuevaFallaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

/**
 * Hardening 3.15.9.3-D: seguridad, concurrencia, E2E refresh, PII, regresión ADMIN.
 */
class ConsultaPublicaCotizacionHardeningTest extends ComercialTestSupport {

    private static final String USUARIO = "admin-hardening-d";
    private static final String IP = "198.51.100.40";

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
    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void resetRateLimit() {
        rateLimiter.reset();
    }

    @Test
    @DisplayName("E2E aprobación: historial CLIENTE_PUBLICO + consulta actualizada sin acciones")
    void e2eAprobacionConsultaActualizada() throws Exception {
        Fixture f = prepararInicialPendiente();

        AccionPublicaCotizacionResponseDTO resp =
            accionPublica.aprobar(f.token, identidad(f.cliente), IP);
        assertThat(resp.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(resp.getOrdenEstado()).isEqualTo(EstadoOrdenServicio.APROBADO);

        List<HistorialEstadoOrdenServicioResponseDTO> historial =
            ordenServicioService.listarHistorial(f.ordenId);
        assertThat(historial).anySatisfy(h ->
            assertThat(h.getUsuario()).isEqualTo(
                ConsultaPublicaCotizacionAccionService.ACTOR_CLIENTE_PUBLICO));

        ConsultaOtPublicaDTO consulta =
            documentoOrdenServicioService.consultaOtPublica(f.token);
        assertThat(consulta.getEstadoCodigo()).isEqualTo("APROBADO");
        assertThat(consulta.isCotizacionDisponible()).isFalse();

        JsonNode json = objectMapper.valueToTree(consulta);
        assertSinPiiCliente(json);
    }

    @Test
    @DisplayName("E2E rechazo: OT COTIZADO + cotización no disponible en GET")
    void e2eRechazoConsultaActualizada() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionResponseDTO resp =
            accionPublica.rechazar(f.token, identidad(f.cliente), IP);
        assertThat(resp.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.RECHAZADA);
        assertThat(resp.getOrdenEstado()).isEqualTo(EstadoOrdenServicio.COTIZADO);

        ConsultaOtPublicaDTO consulta =
            documentoOrdenServicioService.consultaOtPublica(f.token);
        assertThat(consulta.getEstadoCodigo()).isEqualTo("COTIZADO");
        assertThat(consulta.isCotizacionDisponible()).isFalse();
    }

    @Test
    @DisplayName("identidad: ambos incorrectos → mismo 403 genérico (sin enumeración)")
    void ambosIncorrectosSinEnumeracion() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = new AccionPublicaCotizacionRequestDTO();
        req.setNumeroDocumento("1111111111");
        req.setTelefono("3000000000");

        assertThatThrownBy(() -> accionPublica.aprobar(f.token, req, IP))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                ResponseStatusException rse = (ResponseStatusException) ex;
                assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                assertThat(rse.getReason()).isEqualTo("No pudimos validar la información ingresada.");
                assertThat(rse.getReason()).doesNotContainIgnoringCase("documento");
                assertThat(rse.getReason()).doesNotContainIgnoringCase("teléfono");
                assertThat(rse.getReason()).doesNotContainIgnoringCase("cliente");
            });
    }

    @Test
    @DisplayName("token truncado / alterado / con espacios")
    void variantesToken() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = identidad(f.cliente);

        assertThatThrownBy(() ->
                accionPublica.aprobar(f.token.substring(0, Math.min(8, f.token.length())), req, IP))
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));

        String alterado = f.token.substring(0, f.token.length() - 1)
            + (f.token.endsWith("a") ? "b" : "a");
        assertThatThrownBy(() -> accionPublica.aprobar(alterado, req, IP))
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));

        AccionPublicaCotizacionResponseDTO ok =
            accionPublica.aprobar("  " + f.token + "  ", req, IP);
        assertThat(ok.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
    }

    @Test
    @DisplayName("token de otra OT + identidad cruzada no opera sobre OT ajena")
    void tokenOtraOtNoCruzado() {
        Fixture a = prepararInicialPendiente();
        Fixture b = prepararInicialPendiente();

        AccionPublicaCotizacionRequestDTO idA = identidad(a.cliente);
        assertThatThrownBy(() -> accionPublica.aprobar(b.token, idA, IP))
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN));

        assertThat(ordenServicioService.obtenerPorId(a.ordenId).getEstado())
            .isEqualTo(EstadoOrdenServicio.PENDIENTE_APROBACION);
        assertThat(ordenServicioService.obtenerPorId(b.ordenId).getEstado())
            .isEqualTo(EstadoOrdenServicio.PENDIENTE_APROBACION);

        // API pública no acepta cotizacionId: la cotización se resuelve solo desde el token.
        AccionPublicaCotizacionResponseDTO ok =
            accionPublica.aprobar(a.token, idA, "198.51.100.41");
        assertThat(ok.getOrdenNumero()).isEqualTo(a.ordenNumero);
        assertThat(cotizacionService.obtener(b.ordenId, b.cotizacionId).getEstado())
            .isEqualTo(EstadoCotizacionServicio.PENDIENTE_APROBACION);
    }

    @Test
    @DisplayName("GET pública no expone PII del cliente ni costos internos")
    void getPublicoSinPii() throws Exception {
        Fixture f = prepararInicialPendiente();
        ConsultaOtPublicaDTO ot = documentoOrdenServicioService.consultaOtPublica(f.token);
        JsonNode otJson = objectMapper.valueToTree(ot);
        assertSinPiiCliente(otJson);
        assertThat(otJson.has("clienteId")).isFalse();
        assertThat(otJson.has("costo")).isFalse();

        JsonNode cotJson = objectMapper.valueToTree(
            documentoOrdenServicioService.consultaCotizacionOtPublica(f.token));
        assertSinPiiCliente(cotJson);
        assertThat(cotJson.has("usuarioCreacion")).isFalse();
        assertThat(cotJson.has("productoId")).isFalse();
    }

    @Test
    @DisplayName("ADMIN aprueba primero → cliente público recibe conflicto/404 según estado")
    void adminGanaSobreClienteStale() {
        Fixture f = prepararInicialPendiente();
        cotizacionService.aprobar(f.ordenId, f.cotizacionId, USUARIO);

        assertThatThrownBy(() ->
                accionPublica.aprobar(f.token, identidad(f.cliente), IP))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                HttpStatus status = (HttpStatus) ((ResponseStatusException) ex).getStatusCode();
                assertThat(status).isIn(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT);
            });

        CotizacionServicioResponseDTO adminView =
            cotizacionService.obtener(f.ordenId, f.cotizacionId);
        assertThat(adminView.getEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(adminView.getUsuarioAprobacion()).isEqualTo(USUARIO);
    }

    @Test
    @DisplayName("Doble aprobación secuencial: segunda falla; una sola transición pública")
    void dobleAprobacionSegundaFalla() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = identidad(f.cliente);

        AccionPublicaCotizacionResponseDTO first =
            accionPublica.aprobar(f.token, req, IP + "-a");
        assertThat(first.getCotizacionEstado()).isEqualTo(EstadoCotizacionServicio.APROBADA);

        assertThatThrownBy(() -> accionPublica.aprobar(f.token, req, IP + "-b"))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> {
                HttpStatus status = (HttpStatus) ((ResponseStatusException) ex).getStatusCode();
                assertThat(status).isIn(HttpStatus.NOT_FOUND, HttpStatus.CONFLICT);
            });

        assertThat(cotizacionService.obtener(f.ordenId, f.cotizacionId).getEstado())
            .isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(ordenServicioService.obtenerPorId(f.ordenId).getEstado())
            .isEqualTo(EstadoOrdenServicio.APROBADO);

        long transicionesPublicas = ordenServicioService.listarHistorial(f.ordenId).stream()
            .filter(h -> ConsultaPublicaCotizacionAccionService.ACTOR_CLIENTE_PUBLICO
                .equals(h.getUsuario()))
            .count();
        assertThat(transicionesPublicas).isEqualTo(1);
    }

    @Test
    @DisplayName("Aprobar luego rechazar: rechazo rechazado; estado final coherente")
    void aprobarLuegoRechazarSegundaFalla() {
        Fixture f = prepararInicialPendiente();
        AccionPublicaCotizacionRequestDTO req = identidad(f.cliente);

        accionPublica.aprobar(f.token, req, IP + "-ap");
        assertThatThrownBy(() -> accionPublica.rechazar(f.token, req, IP + "-re"))
            .isInstanceOf(ResponseStatusException.class);

        assertThat(cotizacionService.obtener(f.ordenId, f.cotizacionId).getEstado())
            .isEqualTo(EstadoCotizacionServicio.APROBADA);
        assertThat(ordenServicioService.obtenerPorId(f.ordenId).getEstado())
            .isEqualTo(EstadoOrdenServicio.APROBADO);
    }

    @Test
    @DisplayName("regresión ADMIN: presentar + aprobar + rechazar actor administrativo")
    void regresionAdminPresentarAprobarRechazar() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(
            orden.getId(), requestConManoObra("Admin", "1", "90000"), USUARIO);
        CotizacionServicioResponseDTO presentada =
            cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO);
        assertThat(presentada.getEstado()).isEqualTo(EstadoCotizacionServicio.PENDIENTE_APROBACION);

        CotizacionServicioResponseDTO aprobada =
            cotizacionService.aprobar(orden.getId(), cot.getId(), USUARIO);
        assertThat(aprobada.getUsuarioAprobacion()).isEqualTo(USUARIO);
        assertThat(aprobada.getUsuarioAprobacion())
            .isNotEqualTo(ConsultaPublicaCotizacionAccionService.ACTOR_CLIENTE_PUBLICO);

        // Nueva adicional para rechazo ADMIN
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_REPARACION), USUARIO);
        RegistrarNuevaFallaRequestDTO falla = new RegistrarNuevaFallaRequestDTO();
        falla.setNuevaFalla("Falla extra hardening");
        ordenServicioService.registrarNuevaFalla(orden.getId(), falla, USUARIO);
        CotizacionServicioRequestDTO adicionalReq =
            requestConManoObra("Adic", "1", "20000");
        adicionalReq.setMotivoAmpliacion("Falla extra hardening");
        CotizacionServicioResponseDTO adicional = cotizacionService.crearAdicional(
            orden.getId(), adicionalReq, USUARIO);
        cotizacionService.presentar(orden.getId(), adicional.getId(), USUARIO);
        CotizacionServicioResponseDTO rechazada = cotizacionService.rechazar(
            orden.getId(), adicional.getId(), null, USUARIO);
        assertThat(rechazada.getEstado()).isEqualTo(EstadoCotizacionServicio.RECHAZADA);
        assertThat(rechazada.getUsuarioRechazo()).isEqualTo(USUARIO);
    }

    private void assertSinPiiCliente(JsonNode json) {
        String raw = json.toString().toLowerCase();
        assertThat(raw).doesNotContain("numerodocumento");
        assertThat(raw).doesNotContain("numero_documento");
        assertThat(raw).doesNotContain("\"email\"");
        // teléfono del taller puede existir en contacto; no el del Cliente
        assertThat(json.has("telefonoCliente")).isFalse();
        assertThat(json.has("cliente")).isFalse();
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

    private OrdenServicioResponseDTO avanzarADiagnosticado(OrdenServicioResponseDTO orden) {
        ordenServicioService.cambiarEstado(
            orden.getId(), cambio(EstadoOrdenServicio.EN_DIAGNOSTICO), USUARIO);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Fuente dañada");
        return ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO).getOrden();
    }

    private OrdenServicioResponseDTO crearOrdenBasica() {
        Cliente cliente = crearCliente("Cliente hard " + System.nanoTime());
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

    private record Fixture(
        Long ordenId,
        String ordenNumero,
        Long cotizacionId,
        String token,
        Cliente cliente) {}
}
