package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarDiagnosticoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarReparacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EntregaOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.HistorialEstadoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarEntregaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarEntregaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarNuevaFallaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.TransicionOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EntregaOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.HistorialEstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ClienteRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.EntregaOrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.HistorialEstadoOrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepuestoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.SecuenciaDocumentoService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrdenServicioService {

    private static final EnumSet<EstadoOrdenServicio> ESTADOS_TERMINALES = EnumSet.of(
        EstadoOrdenServicio.CERRADO,
        EstadoOrdenServicio.CANCELADO
    );

    private final OrdenServicioRepository ordenServicioRepository;
    private final OrdenServicioRepuestoRepository ordenServicioRepuestoRepository;
    private final HistorialEstadoOrdenServicioRepository historialRepository;
    private final EntregaOrdenServicioRepository entregaRepository;
    private final ClienteRepository clienteRepository;
    private final EquipoService equipoService;
    private final EntregaFirmaService entregaFirmaService;
    private final SecuenciaDocumentoService secuenciaDocumentoService;
    private final ObjectProvider<DocumentoOrdenServicioService> documentoOrdenServicioService;

    @Transactional
    public OrdenServicioResponseDTO crear(OrdenServicioRequestDTO request, String usuario) {
        Cliente cliente = resolverClienteActivoParaTaller(request.getClienteId());
        Equipo equipo = equipoService.buscarOFallar(request.getEquipoId());
        validarEquipoDelCliente(cliente, equipo);
        if (!equipo.isActivo()) {
            throw new BusinessException("El equipo seleccionado está inactivo.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        OrdenServicio orden = OrdenServicio.builder()
            .numero(secuenciaDocumentoService.siguienteNumero(TipoSecuencia.ORDEN_SERVICIO, ahora))
            .cliente(cliente)
            .equipo(equipo)
            .estado(EstadoOrdenServicio.RECEPCIONADO)
            .problemaReportado(textoOpcional(request.getProblemaReportado()))
            .diagnostico(textoOpcional(request.getDiagnostico()))
            .trabajoRealizado(textoOpcional(request.getTrabajoRealizado()))
            .observaciones(textoOpcional(request.getObservaciones()))
            .createdBy(usuario)
            .build();

        OrdenServicio guardada = ordenServicioRepository.save(orden);
        Long ordenId = guardada.getId();
        String usuarioDoc = usuario;
        registrarGeneracionTrasCommit(() -> tryGenerarComprobanteRecepcion(ordenId, usuarioDoc));
        return OrdenServicioResponseDTO.fromEntity(guardada);
    }

    @Transactional(readOnly = true)
    public List<OrdenServicioResponseDTO> listar(Long clienteId, Long equipoId, EstadoOrdenServicio estado) {
        List<OrdenServicio> ordenes;
        if (equipoId != null) {
            ordenes = ordenServicioRepository.findByEquipoIdOrderByFechaRecepcionDesc(equipoId);
        } else if (clienteId != null) {
            ordenes = ordenServicioRepository.findByClienteIdOrderByFechaRecepcionDesc(clienteId);
        } else if (estado != null) {
            ordenes = ordenServicioRepository.findByEstadoOrderByFechaRecepcionDesc(estado);
        } else {
            ordenes = ordenServicioRepository.findAllByOrderByFechaRecepcionDesc();
        }

        if (estado != null && (clienteId != null || equipoId != null)) {
            ordenes = ordenes.stream().filter(o -> o.getEstado() == estado).toList();
        }
        if (clienteId != null && equipoId != null) {
            ordenes = ordenes.stream()
                .filter(o -> o.getCliente().getId().equals(clienteId))
                .toList();
        }

        return ordenes.stream().map(OrdenServicioResponseDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public OrdenServicioResponseDTO obtenerPorId(Long id) {
        return OrdenServicioResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional(readOnly = true)
    public List<HistorialEstadoOrdenServicioResponseDTO> listarHistorial(Long ordenId) {
        buscarOFallar(ordenId);
        return historialRepository.findByOrdenServicioIdOrderByFechaCambioDesc(ordenId).stream()
            .map(HistorialEstadoOrdenServicioResponseDTO::fromEntity)
            .toList();
    }

    /**
     * Actualiza campos de taller sin cambiar estado.
     * No permite editar órdenes CERRADAS o CANCELADAS.
     * No permite cambiar cliente ni equipo (trazabilidad).
     */
    @Transactional
    public OrdenServicioResponseDTO actualizar(Long id, OrdenServicioRequestDTO request) {
        OrdenServicio orden = buscarOFallar(id);
        if (orden.getEstado().esTerminal()) {
            throw new BusinessException("No se puede editar una orden " + orden.getEstado() + ".");
        }
        if (!orden.getCliente().getId().equals(request.getClienteId())
                || !orden.getEquipo().getId().equals(request.getEquipoId())) {
            throw new BusinessException(
                "No se puede cambiar el cliente ni el equipo de una orden existente.");
        }

        orden.setProblemaReportado(textoOpcional(request.getProblemaReportado()));
        orden.setDiagnostico(textoOpcional(request.getDiagnostico()));
        orden.setTrabajoRealizado(textoOpcional(request.getTrabajoRealizado()));
        orden.setObservaciones(textoOpcional(request.getObservaciones()));
        return OrdenServicioResponseDTO.fromEntity(ordenServicioRepository.save(orden));
    }

    /**
     * Transición de negocio atómica: valida matriz + requisitos, cambia estado y escribe historial.
     * Motivos automáticos para acciones normales; motivo manual solo para excepciones.
     */
    @Transactional
    public TransicionOrdenServicioResponseDTO cambiarEstado(
            Long id,
            CambiarEstadoOrdenServicioRequestDTO request,
            String usuario) {
        if (usuario == null || usuario.isBlank()) {
            throw new BusinessException("Se requiere un usuario autenticado para cambiar el estado.");
        }

        OrdenServicio orden = buscarOFallar(id);
        EstadoOrdenServicio anterior = orden.getEstado();
        EstadoOrdenServicio destino = request.getNuevoEstado() != null
            ? request.getNuevoEstado()
            : request.getEstado();

        if (destino == null) {
            throw new BusinessException("El estado destino es obligatorio.");
        }

        if (EstadoOrdenServicio.requiereDominioCotizacion(anterior, destino)) {
            throw new BusinessException(
                "Esta transición se gestiona desde los endpoints de cotización de la orden.");
        }

        String motivo;
        String observacion = textoOpcional(request.getObservacion());
        if (EstadoOrdenServicio.requiereMotivoManual(destino)) {
            String etiqueta = destino == EstadoOrdenServicio.CANCELADO
                ? "El motivo de cancelación es obligatorio."
                : "Describe la nueva falla o situación detectada.";
            motivo = textoRequerido(request.getMotivo(), etiqueta);
        } else {
            motivo = EstadoOrdenServicio.motivoAutomatico(anterior, destino);
            if (textoVacio(motivo)) {
                motivo = "Cambio de estado: " + anterior + " → " + destino + ".";
            }
        }

        return aplicarTransicion(orden, destino, motivo, observacion, usuario.trim());
    }

    /**
     * Transición de OT invocada desde dominios satélite (p. ej. cotizaciones).
     * No aplica el bloqueo de {@link EstadoOrdenServicio#requiereDominioCotizacion}.
     */
    @Transactional
    public TransicionOrdenServicioResponseDTO transicionarPorDominio(
            Long id,
            EstadoOrdenServicio destino,
            String motivo,
            String observacion,
            String usuario) {
        validarUsuario(usuario);
        OrdenServicio orden = buscarOFallar(id);
        String motivoFinal = textoOpcional(motivo);
        if (motivoFinal == null) {
            motivoFinal = EstadoOrdenServicio.motivoAutomatico(orden.getEstado(), destino);
        }
        if (textoVacio(motivoFinal)) {
            motivoFinal = "Cambio de estado: " + orden.getEstado() + " → " + destino + ".";
        }
        return aplicarTransicion(
            orden, destino, motivoFinal, textoOpcional(observacion), usuario.trim());
    }

    /**
     * Guarda ficha técnica y avanza EN_DIAGNOSTICO → DIAGNOSTICADO en una sola transacción.
     */
    @Transactional
    public TransicionOrdenServicioResponseDTO completarDiagnostico(
            Long id,
            CompletarDiagnosticoRequestDTO request,
            String usuario) {
        validarUsuario(usuario);
        OrdenServicio orden = buscarOFallar(id);
        if (orden.getEstado() != EstadoOrdenServicio.EN_DIAGNOSTICO) {
            throw new BusinessException(
                "Solo se puede completar el diagnóstico desde EN_DIAGNOSTICO.");
        }

        String diagnostico = textoRequerido(
            request.getDiagnostico(),
            "Completa el diagnóstico técnico para continuar.");
        if (request.getProblemaReportado() != null) {
            orden.setProblemaReportado(textoOpcional(request.getProblemaReportado()));
        }
        orden.setDiagnostico(diagnostico);
        if (request.getObservaciones() != null) {
            orden.setObservaciones(textoOpcional(request.getObservaciones()));
        }
        ordenServicioRepository.save(orden);

        String motivo = EstadoOrdenServicio.motivoAutomatico(
            EstadoOrdenServicio.EN_DIAGNOSTICO, EstadoOrdenServicio.DIAGNOSTICADO);
        return aplicarTransicion(
            orden, EstadoOrdenServicio.DIAGNOSTICADO, motivo, null, usuario.trim());
    }

    /**
     * Guarda trabajo realizado y avanza EN_REPARACION → LISTO en una sola transacción.
     */
    @Transactional
    public TransicionOrdenServicioResponseDTO completarReparacion(
            Long id,
            CompletarReparacionRequestDTO request,
            String usuario) {
        validarUsuario(usuario);
        OrdenServicio orden = buscarOFallar(id);
        if (orden.getEstado() != EstadoOrdenServicio.EN_REPARACION) {
            throw new BusinessException(
                "Solo se puede marcar como lista desde EN_REPARACION.");
        }

        String trabajo = textoRequerido(
            request.getTrabajoRealizado(),
            "Completa el trabajo realizado antes de marcar la orden como lista.");
        orden.setTrabajoRealizado(trabajo);
        if (request.getObservaciones() != null) {
            orden.setObservaciones(textoOpcional(request.getObservaciones()));
        }
        ordenServicioRepository.save(orden);

        String motivo = EstadoOrdenServicio.motivoAutomatico(
            EstadoOrdenServicio.EN_REPARACION, EstadoOrdenServicio.LISTO);
        return aplicarTransicion(orden, EstadoOrdenServicio.LISTO, motivo, null, usuario.trim());
    }

    /**
     * Registra nueva falla: EN_REPARACION → REQUIERE_APROBACION_ADICIONAL.
     * Cotización formal de ampliación: fase 3.15.7.
     */
    @Transactional
    public TransicionOrdenServicioResponseDTO registrarNuevaFalla(
            Long id,
            RegistrarNuevaFallaRequestDTO request,
            String usuario) {
        validarUsuario(usuario);
        OrdenServicio orden = buscarOFallar(id);
        if (orden.getEstado() != EstadoOrdenServicio.EN_REPARACION) {
            throw new BusinessException(
                "Solo se puede registrar una nueva falla desde EN_REPARACION.");
        }

        String nuevaFalla = textoRequerido(
            request.getNuevaFalla(),
            "Describe la nueva falla o situación detectada.");
        String observacion = textoOpcional(request.getObservacion());
        String motivo = "Se detectó una nueva situación durante la reparación: " + nuevaFalla;
        if (motivo.length() > 500) {
            motivo = motivo.substring(0, 500);
        }

        return aplicarTransicion(
            orden,
            EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL,
            motivo,
            observacion,
            usuario.trim());
    }

    /**
     * Entrega digital atómica (FASE 3.15.5.3):
     * guarda firma + entrega y avanza LISTO → ENTREGADO → CERRADO.
     */
    @Transactional
    public RegistrarEntregaResponseDTO registrarEntrega(
            Long id,
            RegistrarEntregaRequestDTO request,
            String usuario) {
        validarUsuario(usuario);
        OrdenServicio orden = buscarOFallar(id);

        if (orden.getEstado() != EstadoOrdenServicio.LISTO) {
            throw new BusinessException(
                "Solo se puede registrar la entrega desde LISTO.");
        }
        if (entregaRepository.existsByOrdenServicioId(id)) {
            throw new BusinessException(
                "Ya existe un registro de entrega para esta orden.");
        }
        if (!request.isClienteConfirmo()) {
            throw new BusinessException(
                "El cliente debe confirmar la recepción del equipo.");
        }
        if (textoVacio(request.getFirmaBase64())) {
            throw new BusinessException("La firma del cliente es obligatoria.");
        }

        String firmaUrl = entregaFirmaService.guardarDesdeBase64(request.getFirmaBase64());
        LocalDateTime ahora = LocalDateTime.now();
        String responsable = usuario.trim();

        EntregaOrdenServicio entrega = EntregaOrdenServicio.builder()
            .ordenServicio(orden)
            .fechaEntrega(ahora)
            .usuarioResponsable(responsable)
            .clienteConfirmo(true)
            .nombreCliente(textoOpcional(request.getNombreCliente()))
            .documentoCliente(textoOpcional(request.getDocumentoCliente()))
            .firmaUrl(firmaUrl)
            .observaciones(textoOpcional(request.getObservaciones()))
            .createdAt(ahora)
            .build();
        EntregaOrdenServicio entregaGuardada = entregaRepository.save(entrega);

        aplicarTransicion(
            orden,
            EstadoOrdenServicio.ENTREGADO,
            "Se registró la entrega del equipo.",
            null,
            responsable);
        TransicionOrdenServicioResponseDTO cierre = aplicarTransicion(
            orden,
            EstadoOrdenServicio.CERRADO,
            "Se cerró la orden después de registrar la entrega.",
            null,
            responsable);

        Long ordenId = id;
        String usuarioActa = responsable;
        registrarGeneracionTrasCommit(() -> tryGenerarActaEntrega(ordenId, usuarioActa));

        return RegistrarEntregaResponseDTO.builder()
            .orden(cierre.getOrden())
            .entrega(EntregaOrdenServicioResponseDTO.fromEntity(entregaGuardada))
            .mensaje("Entrega registrada y orden cerrada.")
            .build();
    }

    @Transactional(readOnly = true)
    public EntregaOrdenServicioResponseDTO obtenerEntrega(Long ordenId) {
        buscarOFallar(ordenId);
        return entregaRepository.findByOrdenServicioId(ordenId)
            .map(EntregaOrdenServicioResponseDTO::fromEntity)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No hay entrega registrada para esta orden."));
    }

    @Transactional(readOnly = true)
    public OrdenServicio buscarOFallar(Long id) {
        return ordenServicioRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden de servicio no encontrada."));
    }

    /** True si el equipo tiene al menos una OT no terminal. */
    @Transactional(readOnly = true)
    public boolean tieneOrdenActiva(Long equipoId) {
        return ordenServicioRepository.existsByEquipoIdAndEstadoNotIn(equipoId, ESTADOS_TERMINALES);
    }

    private TransicionOrdenServicioResponseDTO aplicarTransicion(
            OrdenServicio orden,
            EstadoOrdenServicio destino,
            String motivo,
            String observacion,
            String usuario) {
        EstadoOrdenServicio anterior = orden.getEstado();
        if (anterior.esTerminal()) {
            throw new BusinessException(
                "No se puede cambiar el estado de una orden " + anterior + ".");
        }
        if (!anterior.puedeTransicionarA(destino)) {
            throw new BusinessException(
                "La transición " + anterior + " → " + destino + " no está permitida.");
        }

        validarRequisitosTransicion(orden, anterior, destino);

        if (destino == EstadoOrdenServicio.CANCELADO
                && ordenServicioRepuestoRepository.existeConsumoNetoPendiente(orden.getId())) {
            throw new BusinessException(
                "No se puede cancelar la orden porque existen repuestos consumidos pendientes de devolución.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        orden.setEstado(destino);
        if (destino == EstadoOrdenServicio.ENTREGADO
                || destino == EstadoOrdenServicio.CERRADO
                || destino == EstadoOrdenServicio.CANCELADO) {
            orden.setFechaCierre(ahora);
        }
        OrdenServicio guardada = ordenServicioRepository.save(orden);

        HistorialEstadoOrdenServicio historial = HistorialEstadoOrdenServicio.builder()
            .ordenServicio(guardada)
            .estadoAnterior(anterior)
            .estadoNuevo(destino)
            .motivo(motivo)
            .observacion(observacion)
            .usuario(usuario)
            .fechaCambio(ahora)
            .build();
        historialRepository.save(historial);

        return TransicionOrdenServicioResponseDTO.builder()
            .orden(OrdenServicioResponseDTO.fromEntity(guardada))
            .estadoAnterior(anterior)
            .estadoNuevo(destino)
            .motivo(motivo)
            .observacion(observacion)
            .usuario(usuario)
            .fechaCambio(ahora)
            .mensaje(mensajeAmigable(anterior, destino))
            .build();
    }

    private void validarRequisitosTransicion(
            OrdenServicio orden,
            EstadoOrdenServicio origen,
            EstadoOrdenServicio destino) {
        if (origen == EstadoOrdenServicio.EN_DIAGNOSTICO
                && destino == EstadoOrdenServicio.DIAGNOSTICADO) {
            if (textoVacio(orden.getDiagnostico())) {
                throw new BusinessException(
                    "Completa el diagnóstico técnico para continuar.");
            }
        }
        if (origen == EstadoOrdenServicio.EN_REPARACION && destino == EstadoOrdenServicio.LISTO) {
            if (textoVacio(orden.getTrabajoRealizado())) {
                throw new BusinessException(
                    "Completa el trabajo realizado antes de marcar la orden como lista.");
            }
        }
        if (origen == EstadoOrdenServicio.EN_REPARACION
                && destino == EstadoOrdenServicio.ESPERA_REPUESTO) {
            if (!ordenServicioRepuestoRepository.existeRepuestoPendiente(orden.getId())) {
                throw new BusinessException(
                    "No existen repuestos pendientes que justifiquen poner la orden en espera.");
            }
        }
    }

    private void registrarGeneracionTrasCommit(Runnable accion) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    // Errores de enlace (p. ej. NoClassDefFoundError) no deben afectar la respuesta HTTP.
                    try {
                        accion.run();
                    } catch (Throwable t) {
                        log.warn("Generación documental post-commit falló: {}", t.toString());
                    }
                }
            });
        } else {
            try {
                accion.run();
            } catch (Throwable t) {
                log.warn("Generación documental fuera de transacción falló: {}", t.toString());
            }
        }
    }

    private void tryGenerarComprobanteRecepcion(Long ordenId, String usuario) {
        try {
            documentoOrdenServicioService.getObject().asegurarComprobanteRecepcion(ordenId, usuario);
        } catch (Throwable t) {
            log.warn("No se pudo generar comprobante de recepción para OT {}: {}",
                ordenId, t.toString());
        }
    }

    private void tryGenerarActaEntrega(Long ordenId, String usuario) {
        try {
            documentoOrdenServicioService.getObject().generarActaEntrega(ordenId, usuario);
        } catch (Throwable t) {
            log.warn("No se pudo generar acta de entrega para OT {}: {}",
                ordenId, t.toString());
        }
    }

    private String mensajeAmigable(EstadoOrdenServicio anterior, EstadoOrdenServicio destino) {
        return "Estado actualizado: " + anterior + " → " + destino + ".";
    }

    private void validarUsuario(String usuario) {
        if (usuario == null || usuario.isBlank()) {
            throw new BusinessException("Se requiere un usuario autenticado para cambiar el estado.");
        }
    }

    private void validarEquipoDelCliente(Cliente cliente, Equipo equipo) {
        if (equipo.getCliente() == null || !equipo.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException(
                "El equipo no pertenece al cliente indicado.");
        }
    }

    private Cliente resolverClienteActivoParaTaller(Long clienteId) {
        if (clienteId == null) {
            throw new BusinessException("El cliente es obligatorio.");
        }
        Cliente cliente = clienteRepository.findById(clienteId)
            .orElseThrow(() -> new BusinessException("El cliente indicado no existe."));
        if (!cliente.isActivo()) {
            throw new BusinessException("El cliente seleccionado está inactivo.");
        }
        if (cliente.esConsumidorFinal()) {
            throw new BusinessException(
                "El consumidor final del sistema no se usa como cliente de taller. Registra un cliente real.");
        }
        return cliente;
    }

    private String textoRequerido(String valor, String mensaje) {
        String limpio = textoOpcional(valor);
        if (limpio == null) {
            throw new BusinessException(mensaje);
        }
        return limpio;
    }

    private boolean textoVacio(String valor) {
        return textoOpcional(valor) == null;
    }

    private String textoOpcional(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
