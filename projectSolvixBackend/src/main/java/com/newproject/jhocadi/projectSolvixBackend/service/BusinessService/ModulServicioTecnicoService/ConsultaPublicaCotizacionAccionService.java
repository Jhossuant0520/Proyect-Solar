package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RechazarCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.CotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.CotizacionServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ClienteIdentidadNormalizer;

import lombok.RequiredArgsConstructor;

/**
 * Acciones públicas de cotización OT (3.15.9.3-B).
 * Solo identidad + anti-abuso; el workflow vive en {@link CotizacionServicioService}.
 */
@Service
@RequiredArgsConstructor
public class ConsultaPublicaCotizacionAccionService {

    /** Actor estable en usuarioAprobacion / usuarioRechazo / historial. */
    public static final String ACTOR_CLIENTE_PUBLICO = "CLIENTE_PUBLICO";

    private static final String MSG_IDENTIDAD =
        "No pudimos validar la información ingresada.";
    private static final String MSG_NO_ENCONTRADO =
        "No encontramos esta orden o el enlace ya no es válido.";
    private static final String MSG_ESTADO_OBSOLETO =
        "La cotización ya no está pendiente de tu respuesta.";

    private final OrdenServicioRepository ordenServicioRepository;
    private final CotizacionServicioRepository cotizacionRepository;
    private final CotizacionServicioService cotizacionServicioService;
    private final ClienteIdentidadNormalizer identidadNormalizer;
    private final PublicActionRateLimiter rateLimiter;

    @Transactional
    public AccionPublicaCotizacionResponseDTO aprobar(
            String token,
            AccionPublicaCotizacionRequestDTO request,
            String clientIp) {
        rateLimiter.checkAndConsume(rateKey(token, clientIp));
        OrdenServicio orden = resolverOrden(token);
        CotizacionServicio cotizacion = resolverCotizacionPublicable(orden);
        exigirIdentidad(orden.getCliente(), request);

        CotizacionServicioResponseDTO result;
        try {
            result = cotizacionServicioService.aprobar(
                orden.getId(), cotizacion.getId(), ACTOR_CLIENTE_PUBLICO);
        } catch (BusinessException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, MSG_ESTADO_OBSOLETO, ex);
        }

        return toPublicResponse(
            orden.getNumero(),
            result,
            "Cotización aprobada. El taller continuará con el proceso.");
    }

    @Transactional
    public AccionPublicaCotizacionResponseDTO rechazar(
            String token,
            AccionPublicaCotizacionRequestDTO request,
            String clientIp) {
        rateLimiter.checkAndConsume(rateKey(token, clientIp));
        OrdenServicio orden = resolverOrden(token);
        CotizacionServicio cotizacion = resolverCotizacionPublicable(orden);
        exigirIdentidad(orden.getCliente(), request);

        RechazarCotizacionRequestDTO rechazo = new RechazarCotizacionRequestDTO();
        if (request != null) {
            rechazo.setObservacion(request.getObservacion());
        }

        CotizacionServicioResponseDTO result;
        try {
            result = cotizacionServicioService.rechazar(
                orden.getId(), cotizacion.getId(), rechazo, ACTOR_CLIENTE_PUBLICO);
        } catch (BusinessException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, MSG_ESTADO_OBSOLETO, ex);
        }

        return toPublicResponse(
            orden.getNumero(),
            result,
            "Cotización rechazada. El taller revisará la propuesta.");
    }

    private OrdenServicio resolverOrden(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, MSG_NO_ENCONTRADO);
        }
        return ordenServicioRepository.findByTokenConsulta(token.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, MSG_NO_ENCONTRADO));
    }

    /**
     * Misma regla que la consulta GET: solo cotización PENDIENTE_APROBACION
     * mientras la OT está en PENDIENTE_APROBACION.
     */
    private CotizacionServicio resolverCotizacionPublicable(OrdenServicio orden) {
        if (orden.getEstado() != EstadoOrdenServicio.PENDIENTE_APROBACION) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No hay una cotización pendiente de tu respuesta.");
        }
        return cotizacionRepository
            .findByOrdenServicioIdOrderByFechaCreacionAsc(orden.getId()).stream()
            .filter(c -> c.getEstado() == EstadoCotizacionServicio.PENDIENTE_APROBACION)
            .reduce((primera, ultima) -> ultima)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No hay una cotización pendiente de tu respuesta."));
    }

    private void exigirIdentidad(Cliente cliente, AccionPublicaCotizacionRequestDTO request) {
        if (request == null
            || request.getNumeroDocumento() == null
            || request.getTelefono() == null
            || cliente == null) {
            throw identidadInvalida();
        }
        if (cliente.getNumeroDocumento() == null || cliente.getNumeroDocumento().isBlank()
            || cliente.getTelefono() == null || cliente.getTelefono().isBlank()) {
            // Cliente de OT incompleto: no filtrar el motivo.
            throw identidadInvalida();
        }
        boolean docOk = identidadNormalizer.documentosEquivalentes(
            cliente.getNumeroDocumento(),
            cliente.getTipoDocumento(),
            request.getNumeroDocumento(),
            cliente.getTipoDocumento());
        boolean telOk = identidadNormalizer.telefonosEquivalentes(
            cliente.getTelefono(),
            request.getTelefono());
        if (!docOk || !telOk) {
            throw identidadInvalida();
        }
    }

    private static ResponseStatusException identidadInvalida() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, MSG_IDENTIDAD);
    }

    private static String rateKey(String token, String clientIp) {
        String t = token == null ? "" : token.trim();
        String ip = clientIp == null || clientIp.isBlank() ? "unknown" : clientIp.trim();
        return "cot-accion:" + t + "|" + ip;
    }

    private AccionPublicaCotizacionResponseDTO toPublicResponse(
            String ordenNumero,
            CotizacionServicioResponseDTO result,
            String mensaje) {
        EstadoOrdenServicio ordenEstado = null;
        if (result.getOrdenServicioId() != null) {
            ordenEstado = ordenServicioRepository.findById(result.getOrdenServicioId())
                .map(OrdenServicio::getEstado)
                .orElse(null);
        }
        return AccionPublicaCotizacionResponseDTO.builder()
            .ordenNumero(ordenNumero)
            .ordenEstado(ordenEstado)
            .cotizacionNumero(result.getNumero())
            .cotizacionTipo(result.getTipo())
            .cotizacionEstado(result.getEstado())
            .mensaje(mensaje)
            .build();
    }
}
