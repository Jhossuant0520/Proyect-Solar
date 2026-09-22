package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DetalleCotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DetalleCotizacionServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RechazarCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ResumenEconomicoOrdenServicioDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.CotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.DetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicioRepuesto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.CotizacionServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepuestoRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.SecuenciaDocumentoService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Cotizaciones formales de OT (FASE 3.15.7).
 * Independiente de inventario: no toca InventarioService ni precios/costos de Producto.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CotizacionServicioService {

    private static final int MONEY_SCALE = 2;
    private static final RoundingMode MONEY_ROUNDING = RoundingMode.HALF_UP;
    private static final BigDecimal ZERO = money(BigDecimal.ZERO);

    private static final List<EstadoCotizacionServicio> ESTADOS_ACTIVOS = List.of(
        EstadoCotizacionServicio.BORRADOR,
        EstadoCotizacionServicio.PENDIENTE_APROBACION);

    private static final EnumSet<EstadoOrdenServicio> ESTADOS_CREAR_INICIAL = EnumSet.of(
        EstadoOrdenServicio.DIAGNOSTICADO,
        EstadoOrdenServicio.COTIZADO);

    private static final EnumSet<EstadoOrdenServicio> ESTADOS_CREAR_ADICIONAL = EnumSet.of(
        EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL,
        EstadoOrdenServicio.PENDIENTE_APROBACION);

    private final CotizacionServicioRepository cotizacionRepository;
    private final OrdenServicioRepuestoRepository ordenServicioRepuestoRepository;
    private final OrdenServicioService ordenServicioService;
    private final SecuenciaDocumentoService secuenciaDocumentoService;
    private final ProductoRepository productoRepository;
    private final ObjectProvider<DocumentoOrdenServicioService> documentoOrdenServicioService;

    @Transactional(readOnly = true)
    public List<CotizacionServicioResponseDTO> listar(Long ordenId) {
        ordenServicioService.buscarOFallar(ordenId);
        return cotizacionRepository.findByOrdenServicioIdOrderByFechaCreacionAsc(ordenId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public CotizacionServicioResponseDTO obtener(Long ordenId, Long cotizacionId) {
        return toResponse(buscarCotizacion(ordenId, cotizacionId));
    }

    @Transactional(readOnly = true)
    public ResumenEconomicoOrdenServicioDTO resumenEconomico(Long ordenId) {
        ordenServicioService.buscarOFallar(ordenId);
        BigDecimal totalAutorizado = ZERO;
        BigDecimal repuestos = ZERO;
        BigDecimal manoObra = ZERO;
        BigDecimal otros = ZERO;

        for (CotizacionServicio cotizacion :
                cotizacionRepository.findByOrdenServicioIdOrderByFechaCreacionAsc(ordenId)) {
            if (cotizacion.getEstado() != EstadoCotizacionServicio.APROBADA) {
                continue;
            }
            totalAutorizado = totalAutorizado.add(money(cotizacion.getTotal()));
            for (DetalleCotizacionServicio d : cotizacion.getDetalles()) {
                BigDecimal sub = money(d.getSubtotal());
                if (d.getTipo() == TipoDetalleCotizacionServicio.REPUESTO) {
                    repuestos = repuestos.add(sub);
                } else if (d.getTipo() == TipoDetalleCotizacionServicio.MANO_OBRA) {
                    manoObra = manoObra.add(sub);
                } else {
                    otros = otros.add(sub);
                }
            }
        }

        return ResumenEconomicoOrdenServicioDTO.builder()
            .ordenServicioId(ordenId)
            .totalAutorizado(money(totalAutorizado))
            .subtotalRepuestosAprobados(money(repuestos))
            .subtotalManoObraAprobados(money(manoObra))
            .subtotalOtrosAprobados(money(otros))
            .build();
    }

    @Transactional
    public CotizacionServicioResponseDTO crearInicial(
            Long ordenId,
            CotizacionServicioRequestDTO request,
            String usuario) {
        String responsable = validarUsuario(usuario);
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);

        if (!ESTADOS_CREAR_INICIAL.contains(orden.getEstado())) {
            throw new BusinessException(
                "La cotización inicial solo se puede crear con la orden en DIAGNOSTICADO o COTIZADO.");
        }
        validarSinCotizacionActiva(ordenId);

        CotizacionServicio cotizacion = construirBorrador(
            orden, TipoCotizacionServicio.INICIAL, request, responsable, false);
        if (!esCotizacionValida(cotizacion)) {
            throw new BusinessException(
                "La cotización debe tener al menos una línea y un total mayor que cero.");
        }
        CotizacionServicio guardada = cotizacionRepository.save(cotizacion);

        if (orden.getEstado() == EstadoOrdenServicio.DIAGNOSTICADO) {
            ordenServicioService.transicionarPorDominio(
                ordenId,
                EstadoOrdenServicio.COTIZADO,
                EstadoOrdenServicio.motivoAutomatico(
                    EstadoOrdenServicio.DIAGNOSTICADO, EstadoOrdenServicio.COTIZADO),
                null,
                responsable);
        }

        return toResponse(buscarCotizacion(ordenId, guardada.getId()));
    }

    @Transactional
    public CotizacionServicioResponseDTO crearAdicional(
            Long ordenId,
            CotizacionServicioRequestDTO request,
            String usuario) {
        String responsable = validarUsuario(usuario);
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);

        if (!ESTADOS_CREAR_ADICIONAL.contains(orden.getEstado())) {
            throw new BusinessException(
                "La cotización adicional solo se puede crear con la orden en "
                    + "REQUIERE_APROBACION_ADICIONAL o PENDIENTE_APROBACION.");
        }
        validarSinCotizacionActiva(ordenId);

        CotizacionServicio cotizacion = construirBorrador(
            orden, TipoCotizacionServicio.ADICIONAL, request, responsable, true);
        if (!esCotizacionValida(cotizacion)) {
            throw new BusinessException(
                "La cotización debe tener al menos una línea y un total mayor que cero.");
        }
        return toResponse(cotizacionRepository.save(cotizacion));
    }

    @Transactional
    public CotizacionServicioResponseDTO actualizar(
            Long ordenId,
            Long cotizacionId,
            CotizacionServicioRequestDTO request,
            String usuario) {
        String responsable = validarUsuario(usuario);
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        CotizacionServicio cotizacion = buscarCotizacion(ordenId, cotizacionId);

        if (cotizacion.getEstado() != EstadoCotizacionServicio.BORRADOR) {
            throw new BusinessException("Solo se puede editar una cotización en BORRADOR.");
        }

        if (cotizacion.getTipo() == TipoCotizacionServicio.ADICIONAL) {
            String motivo = textoRequerido(
                request.getMotivoAmpliacion() != null
                    ? request.getMotivoAmpliacion()
                    : cotizacion.getMotivoAmpliacion(),
                "El motivo de ampliación es obligatorio en cotizaciones adicionales.");
            cotizacion.setMotivoAmpliacion(motivo);
        } else if (request.getMotivoAmpliacion() != null) {
            cotizacion.setMotivoAmpliacion(textoOpcional(request.getMotivoAmpliacion()));
        }

        cotizacion.setObservaciones(textoOpcional(request.getObservaciones()));
        cotizacion.limpiarDetalles();
        aplicarDetalles(cotizacion, request.getDetalles());
        recalcularTotales(cotizacion);
        CotizacionServicio guardada = cotizacionRepository.save(cotizacion);

        if (orden.getEstado() == EstadoOrdenServicio.DIAGNOSTICADO && esCotizacionValida(guardada)) {
            ordenServicioService.transicionarPorDominio(
                ordenId,
                EstadoOrdenServicio.COTIZADO,
                EstadoOrdenServicio.motivoAutomatico(
                    EstadoOrdenServicio.DIAGNOSTICADO, EstadoOrdenServicio.COTIZADO),
                null,
                responsable);
        }

        return toResponse(buscarCotizacion(ordenId, guardada.getId()));
    }

    @Transactional
    public CotizacionServicioResponseDTO presentar(Long ordenId, Long cotizacionId, String usuario) {
        String responsable = validarUsuario(usuario);
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        CotizacionServicio cotizacion = buscarCotizacion(ordenId, cotizacionId);

        if (cotizacion.getEstado() != EstadoCotizacionServicio.BORRADOR) {
            throw new BusinessException("Solo se puede presentar una cotización en BORRADOR.");
        }
        if (!esCotizacionValida(cotizacion)) {
            throw new BusinessException(
                "La cotización debe tener al menos una línea y un total mayor que cero.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        cotizacion.setEstado(EstadoCotizacionServicio.PENDIENTE_APROBACION);
        cotizacion.setFechaPresentacion(ahora);
        cotizacion.setUsuarioPresentacion(responsable);
        CotizacionServicio guardada = cotizacionRepository.save(cotizacion);

        EstadoOrdenServicio estadoOt = orden.getEstado();
        if (estadoOt == EstadoOrdenServicio.COTIZADO
                || estadoOt == EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL) {
            ordenServicioService.transicionarPorDominio(
                ordenId,
                EstadoOrdenServicio.PENDIENTE_APROBACION,
                "Se presentó la cotización al cliente.",
                null,
                responsable);
        }

        Long cotId = guardada.getId();
        String usuarioPdf = responsable;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    tryGenerarCotizacionPdf(ordenId, cotId, usuarioPdf);
                }
            });
        } else {
            tryGenerarCotizacionPdf(ordenId, cotId, usuarioPdf);
        }

        return toResponse(buscarCotizacion(ordenId, guardada.getId()));
    }

    private void tryGenerarCotizacionPdf(Long ordenId, Long cotizacionId, String usuario) {
        try {
            documentoOrdenServicioService.getObject()
                .generarCotizacionPdf(ordenId, cotizacionId, usuario);
        } catch (Throwable t) {
            log.warn("No se pudo generar PDF de cotización {} OT {}: {}",
                cotizacionId, ordenId, t.toString());
        }
    }

    @Transactional
    public CotizacionServicioResponseDTO aprobar(Long ordenId, Long cotizacionId, String usuario) {
        String responsable = validarUsuario(usuario);
        ordenServicioService.buscarOFallar(ordenId);
        CotizacionServicio cotizacion = buscarCotizacion(ordenId, cotizacionId);

        if (cotizacion.getEstado() != EstadoCotizacionServicio.PENDIENTE_APROBACION) {
            throw new BusinessException(
                "Solo se puede aprobar una cotización en PENDIENTE_APROBACION.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        cotizacion.setEstado(EstadoCotizacionServicio.APROBADA);
        cotizacion.setFechaAprobacion(ahora);
        cotizacion.setUsuarioAprobacion(responsable);
        CotizacionServicio guardada = cotizacionRepository.save(cotizacion);

        if (guardada.getTipo() == TipoCotizacionServicio.INICIAL) {
            ordenServicioService.transicionarPorDominio(
                ordenId,
                EstadoOrdenServicio.APROBADO,
                "El cliente aprobó la cotización.",
                null,
                responsable);
        } else {
            ordenServicioService.transicionarPorDominio(
                ordenId,
                EstadoOrdenServicio.EN_REPARACION,
                "Se reanudó la reparación tras la aprobación adicional.",
                null,
                responsable);
        }

        return toResponse(buscarCotizacion(ordenId, guardada.getId()));
    }

    @Transactional
    public CotizacionServicioResponseDTO rechazar(
            Long ordenId,
            Long cotizacionId,
            RechazarCotizacionRequestDTO request,
            String usuario) {
        String responsable = validarUsuario(usuario);
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        CotizacionServicio cotizacion = buscarCotizacion(ordenId, cotizacionId);

        if (cotizacion.getEstado() != EstadoCotizacionServicio.PENDIENTE_APROBACION) {
            throw new BusinessException(
                "Solo se puede rechazar una cotización en PENDIENTE_APROBACION.");
        }

        String observacion = request != null ? textoOpcional(request.getObservacion()) : null;
        LocalDateTime ahora = LocalDateTime.now();
        cotizacion.setEstado(EstadoCotizacionServicio.RECHAZADA);
        cotizacion.setFechaRechazo(ahora);
        cotizacion.setUsuarioRechazo(responsable);
        if (observacion != null) {
            String actual = cotizacion.getObservaciones();
            cotizacion.setObservaciones(
                actual == null ? observacion : actual + " | Rechazo: " + observacion);
        }
        CotizacionServicio guardada = cotizacionRepository.save(cotizacion);

        if (orden.getEstado() == EstadoOrdenServicio.PENDIENTE_APROBACION) {
            if (guardada.getTipo() == TipoCotizacionServicio.INICIAL) {
                ordenServicioService.transicionarPorDominio(
                    ordenId,
                    EstadoOrdenServicio.COTIZADO,
                    EstadoOrdenServicio.motivoAutomatico(
                        EstadoOrdenServicio.PENDIENTE_APROBACION, EstadoOrdenServicio.COTIZADO),
                    observacion,
                    responsable);
            } else {
                ordenServicioService.transicionarPorDominio(
                    ordenId,
                    EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL,
                    EstadoOrdenServicio.motivoAutomatico(
                        EstadoOrdenServicio.PENDIENTE_APROBACION,
                        EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL),
                    observacion,
                    responsable);
            }
        }

        return toResponse(buscarCotizacion(ordenId, guardada.getId()));
    }

    /**
     * Eliminación física solo de borradores (nunca presentados / aprobados / rechazados).
     */
    @Transactional
    public void eliminarBorrador(Long ordenId, Long cotizacionId, String usuario) {
        validarUsuario(usuario);
        CotizacionServicio cotizacion = buscarCotizacion(ordenId, cotizacionId);
        if (cotizacion.getEstado() != EstadoCotizacionServicio.BORRADOR) {
            throw new BusinessException("Solo se puede eliminar una cotización en BORRADOR.");
        }
        cotizacionRepository.delete(cotizacion);
    }

    private CotizacionServicio construirBorrador(
            OrdenServicio orden,
            TipoCotizacionServicio tipo,
            CotizacionServicioRequestDTO request,
            String usuario,
            boolean exigirMotivoAmpliacion) {
        if (request == null) {
            request = new CotizacionServicioRequestDTO();
        }
        String motivoAmpliacion = null;
        if (exigirMotivoAmpliacion) {
            motivoAmpliacion = textoRequerido(
                request.getMotivoAmpliacion(),
                "El motivo de ampliación es obligatorio en cotizaciones adicionales.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        CotizacionServicio cotizacion = CotizacionServicio.builder()
            .ordenServicio(orden)
            .numero(secuenciaDocumentoService.siguienteNumero(TipoSecuencia.COTIZACION_SERVICIO, ahora))
            .tipo(tipo)
            .estado(EstadoCotizacionServicio.BORRADOR)
            .fechaCreacion(ahora)
            .usuarioCreacion(usuario)
            .subtotal(ZERO)
            .total(ZERO)
            .observaciones(textoOpcional(request.getObservaciones()))
            .motivoAmpliacion(motivoAmpliacion)
            .detalles(new ArrayList<>())
            .build();

        aplicarDetalles(cotizacion, request.getDetalles());
        recalcularTotales(cotizacion);
        return cotizacion;
    }

    private void aplicarDetalles(
            CotizacionServicio cotizacion,
            List<DetalleCotizacionServicioRequestDTO> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }
        for (DetalleCotizacionServicioRequestDTO req : requests) {
            cotizacion.agregarDetalle(construirDetalle(cotizacion, req));
        }
    }

    private DetalleCotizacionServicio construirDetalle(
            CotizacionServicio cotizacion,
            DetalleCotizacionServicioRequestDTO request) {
        if (request.getTipo() == null) {
            throw new BusinessException("El tipo de línea es obligatorio.");
        }

        BigDecimal cantidad = money(request.getCantidad());
        if (cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("La cantidad debe ser mayor que cero.");
        }

        Producto producto = null;
        OrdenServicioRepuesto repuesto = null;
        String descripcion = textoOpcional(request.getDescripcion());
        String productoNombreSnapshot = null;
        BigDecimal precioUnitario = request.getPrecioUnitario();

        if (request.getOrdenServicioRepuestoId() != null) {
            if (request.getTipo() != TipoDetalleCotizacionServicio.REPUESTO) {
                throw new BusinessException(
                    "ordenServicioRepuestoId solo aplica a líneas de tipo REPUESTO.");
            }
            repuesto = ordenServicioRepuestoRepository
                .findByIdAndOrdenServicioId(
                    request.getOrdenServicioRepuestoId(),
                    cotizacion.getOrdenServicio().getId())
                .orElseThrow(() -> new BusinessException(
                    "El repuesto indicado no pertenece a esta orden de servicio."));
            if (repuesto.isAnulado()) {
                throw new BusinessException("No se puede cotizar un repuesto anulado.");
            }
            BigDecimal planificada = BigDecimal.valueOf(repuesto.getCantidadPlanificada());
            if (cantidad.compareTo(planificada) > 0) {
                throw new BusinessException(
                    "La cantidad cotizada no puede superar la planificada ("
                        + repuesto.getCantidadPlanificada() + ").");
            }
            producto = repuesto.getProducto();
            productoNombreSnapshot = repuesto.getProductoNombre();
            if (descripcion == null) {
                descripcion = productoNombreSnapshot;
            }
            if (precioUnitario == null) {
                if (producto.getPrecioVentaActual() == null) {
                    throw new BusinessException(
                        "El producto '" + producto.getNombre()
                            + "' no tiene precio de venta; indícalo en la línea.");
                }
                precioUnitario = producto.getPrecioVentaActual();
            }
        } else if (request.getProductoId() != null) {
            producto = productoRepository.findById(request.getProductoId())
                .orElseThrow(() -> new BusinessException("El producto indicado no existe."));
            productoNombreSnapshot = producto.getNombre();
            if (descripcion == null) {
                descripcion = producto.getNombre();
            }
            if (precioUnitario == null) {
                if (producto.getPrecioVentaActual() == null) {
                    throw new BusinessException(
                        "El producto '" + producto.getNombre()
                            + "' no tiene precio de venta; indícalo en la línea.");
                }
                precioUnitario = producto.getPrecioVentaActual();
            }
        }

        if (descripcion == null) {
            throw new BusinessException("La descripción de la línea es obligatoria.");
        }
        if (precioUnitario == null) {
            throw new BusinessException("El precio unitario es obligatorio.");
        }
        precioUnitario = money(precioUnitario);
        if (precioUnitario.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("El precio unitario no puede ser negativo.");
        }

        BigDecimal subtotal = money(cantidad.multiply(precioUnitario));

        return DetalleCotizacionServicio.builder()
            .cotizacion(cotizacion)
            .tipo(request.getTipo())
            .descripcion(descripcion)
            .cantidad(cantidad)
            .precioUnitario(precioUnitario)
            .subtotal(subtotal)
            .producto(producto)
            .productoNombreSnapshot(productoNombreSnapshot)
            .ordenServicioRepuesto(repuesto)
            .build();
    }

    private void recalcularTotales(CotizacionServicio cotizacion) {
        BigDecimal subtotal = ZERO;
        for (DetalleCotizacionServicio d : cotizacion.getDetalles()) {
            subtotal = subtotal.add(money(d.getSubtotal()));
        }
        cotizacion.setSubtotal(money(subtotal));
        cotizacion.setTotal(money(subtotal));
    }

    private boolean esCotizacionValida(CotizacionServicio cotizacion) {
        return cotizacion.getDetalles() != null
            && !cotizacion.getDetalles().isEmpty()
            && cotizacion.getTotal() != null
            && cotizacion.getTotal().compareTo(BigDecimal.ZERO) > 0;
    }

    private void validarSinCotizacionActiva(Long ordenId) {
        if (cotizacionRepository.existsByOrdenServicioIdAndEstadoIn(ordenId, ESTADOS_ACTIVOS)) {
            throw new BusinessException(
                "Ya existe una cotización activa (BORRADOR o PENDIENTE_APROBACION) para esta orden.");
        }
    }

    private CotizacionServicio buscarCotizacion(Long ordenId, Long cotizacionId) {
        ordenServicioService.buscarOFallar(ordenId);
        return cotizacionRepository.findByIdAndOrdenServicioId(cotizacionId, ordenId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Cotización no encontrada en esta orden de servicio."));
    }

    private CotizacionServicioResponseDTO toResponse(CotizacionServicio cotizacion) {
        BigDecimal subRepuestos = ZERO;
        BigDecimal subManoObra = ZERO;
        BigDecimal subOtros = ZERO;
        List<DetalleCotizacionServicioResponseDTO> detalles = new ArrayList<>();

        for (DetalleCotizacionServicio d : cotizacion.getDetalles()) {
            detalles.add(DetalleCotizacionServicioResponseDTO.fromEntity(d));
            BigDecimal sub = money(d.getSubtotal());
            if (d.getTipo() == TipoDetalleCotizacionServicio.REPUESTO) {
                subRepuestos = subRepuestos.add(sub);
            } else if (d.getTipo() == TipoDetalleCotizacionServicio.MANO_OBRA) {
                subManoObra = subManoObra.add(sub);
            } else {
                subOtros = subOtros.add(sub);
            }
        }

        boolean borrador = cotizacion.getEstado() == EstadoCotizacionServicio.BORRADOR;
        boolean pendiente =
            cotizacion.getEstado() == EstadoCotizacionServicio.PENDIENTE_APROBACION;

        return CotizacionServicioResponseDTO.builder()
            .id(cotizacion.getId())
            .ordenServicioId(
                cotizacion.getOrdenServicio() != null ? cotizacion.getOrdenServicio().getId() : null)
            .numero(cotizacion.getNumero())
            .tipo(cotizacion.getTipo())
            .estado(cotizacion.getEstado())
            .fechaCreacion(cotizacion.getFechaCreacion())
            .fechaPresentacion(cotizacion.getFechaPresentacion())
            .fechaAprobacion(cotizacion.getFechaAprobacion())
            .fechaRechazo(cotizacion.getFechaRechazo())
            .usuarioCreacion(cotizacion.getUsuarioCreacion())
            .usuarioPresentacion(cotizacion.getUsuarioPresentacion())
            .usuarioAprobacion(cotizacion.getUsuarioAprobacion())
            .usuarioRechazo(cotizacion.getUsuarioRechazo())
            .subtotal(money(cotizacion.getSubtotal()))
            .total(money(cotizacion.getTotal()))
            .subtotalRepuestos(money(subRepuestos))
            .subtotalManoObra(money(subManoObra))
            .subtotalOtros(money(subOtros))
            .observaciones(cotizacion.getObservaciones())
            .motivoAmpliacion(cotizacion.getMotivoAmpliacion())
            .detalles(detalles)
            .puedeEditar(borrador)
            .puedePresentar(borrador && esCotizacionValida(cotizacion))
            .puedeAprobar(pendiente)
            .puedeRechazar(pendiente)
            .build();
    }

    private String validarUsuario(String usuario) {
        if (usuario == null || usuario.isBlank()) {
            throw new BusinessException("Se requiere un usuario autenticado.");
        }
        return usuario.trim();
    }

    private String textoRequerido(String valor, String mensaje) {
        String limpio = textoOpcional(valor);
        if (limpio == null) {
            throw new BusinessException(mensaje);
        }
        return limpio;
    }

    private String textoOpcional(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    private static BigDecimal money(BigDecimal valor) {
        if (valor == null) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        }
        return valor.setScale(MONEY_SCALE, MONEY_ROUNDING);
    }
}
