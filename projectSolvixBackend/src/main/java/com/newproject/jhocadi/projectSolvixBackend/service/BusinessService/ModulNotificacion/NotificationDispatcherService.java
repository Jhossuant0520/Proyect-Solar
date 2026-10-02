package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import java.time.LocalDateTime;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.EstadoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulNotificacion.NotificacionRepository;

/**
 * Procesa notificaciones PENDIENTES vía {@link NotificationChannelAdapter}.
 * No crea notificaciones (eso es {@link NotificationService}).
 * No abre transacciones de BD durante el envío del adapter.
 */
@Service
public class NotificationDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcherService.class);

    public static final String ERROR_CANAL_SIN_ADAPTER = "CANAL_SIN_ADAPTER";
    public static final String ERROR_ADAPTER_EXCEPTION = "ADAPTER_EXCEPTION";
    public static final String ERROR_VALIDACION = "VALIDACION";

    private final NotificacionRepository notificacionRepository;
    private final NotificationChannelRegistry channelRegistry;
    private final TransactionTemplate transactionTemplate;

    public NotificationDispatcherService(
            NotificacionRepository notificacionRepository,
            NotificationChannelRegistry channelRegistry,
            PlatformTransactionManager transactionManager) {
        this.notificacionRepository = notificacionRepository;
        this.channelRegistry = channelRegistry;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Reclama y procesa una notificación por id.
     * Idempotente: ENVIADA / FALLIDA / CANCELADA / PROCESANDO no se reprocesan.
     */
    public NotificationDispatchResult dispatch(Long notificacionId) {
        if (notificacionId == null) {
            return NotificationDispatchResult.notFound(null);
        }

        Optional<Notificacion> claimed = reclamarPendiente(notificacionId);
        if (claimed.isEmpty()) {
            return resultadoSinClaim(notificacionId);
        }

        Notificacion snapshot = claimed.get();
        CanalNotificacion canal = snapshot.getCanal();
        Optional<NotificationChannelAdapter> adapterOpt = channelRegistry.resolve(canal);

        if (adapterOpt.isEmpty()) {
            String mensaje = "No existe un adaptador configurado para el canal "
                + (canal != null ? canal.name() : "DESCONOCIDO") + ".";
            log.warn(
                "Dispatch notificacionId={} ot={} canal={}: {}",
                snapshot.getId(),
                snapshot.getOrdenServicioId(),
                canal,
                ERROR_CANAL_SIN_ADAPTER);
            NotificationSendResult fail =
                NotificationSendResult.failure(ERROR_CANAL_SIN_ADAPTER, mensaje);
            Notificacion finalizada = finalizar(snapshot.getId(), null, fail);
            return NotificationDispatchResult.processed(finalizada, null, fail);
        }

        NotificationChannelAdapter adapter = adapterOpt.get();
        NotificationSendResult sendResult;
        try {
            // Fuera de transacción de BD: preparado para llamadas HTTP futuras.
            sendResult = adapter.send(snapshot);
            if (sendResult == null) {
                sendResult = NotificationSendResult.failure(
                    ERROR_VALIDACION,
                    "El adapter devolvió resultado nulo");
            }
        } catch (Exception ex) {
            log.warn(
                "Excepción en adapter={} notificacionId={} ot={} canal={}: {}",
                adapter.codigo(),
                snapshot.getId(),
                snapshot.getOrdenServicioId(),
                canal,
                safeMessage(ex));
            sendResult = NotificationSendResult.failure(
                ERROR_ADAPTER_EXCEPTION,
                safeMessage(ex));
        }

        Notificacion finalizada = finalizar(snapshot.getId(), adapter.codigo(), sendResult);
        log.info(
            "Dispatch notificacionId={} ot={} canal={} adapter={} estado={}",
            finalizada.getId(),
            finalizada.getOrdenServicioId(),
            finalizada.getCanal(),
            adapter.codigo(),
            finalizada.getEstado());
        return NotificationDispatchResult.processed(finalizada, adapter.codigo(), sendResult);
    }

    private Optional<Notificacion> reclamarPendiente(Long id) {
        return transactionTemplate.execute(status -> {
            int rows = notificacionRepository.claimPendienteAProcesando(
                id,
                EstadoNotificacion.PENDIENTE,
                EstadoNotificacion.PROCESANDO,
                LocalDateTime.now());
            if (rows == 0) {
                return Optional.empty();
            }
            return notificacionRepository.findById(id);
        });
    }

    private NotificationDispatchResult resultadoSinClaim(Long id) {
        Optional<Notificacion> actual = notificacionRepository.findById(id);
        if (actual.isEmpty()) {
            return NotificationDispatchResult.notFound(id);
        }
        EstadoNotificacion estado = actual.get().getEstado();
        String reason = switch (estado) {
            case ENVIADA -> "YA_ENVIADA";
            case FALLIDA -> "YA_FALLIDA";
            case CANCELADA -> "CANCELADA";
            case PROCESANDO -> "EN_PROCESO";
            case PENDIENTE -> "NO_RECLAMADA";
        };
        return NotificationDispatchResult.skipped(id, estado, reason);
    }

    private Notificacion finalizar(
            Long id,
            String adapterCodigo,
            NotificationSendResult sendResult) {
        return transactionTemplate.execute(status -> {
            Notificacion n = notificacionRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException(
                    "Notificación reclamada no encontrada: " + id));
            if (n.getEstado() != EstadoNotificacion.PROCESANDO) {
                // Defensa: no sobrescribir ENVIADA/FALLIDA/CANCELADA.
                return n;
            }
            n.setAdapterCodigo(adapterCodigo);
            if (sendResult.success()) {
                n.setEstado(EstadoNotificacion.ENVIADA);
                n.setFechaEnvio(LocalDateTime.now());
                n.setProveedorMensajeId(sendResult.providerMessageId());
                n.setErrorResumen(null);
            } else {
                n.setEstado(EstadoNotificacion.FALLIDA);
                n.setFechaEnvio(null);
                n.setProveedorMensajeId(null);
                n.setErrorResumen(componerErrorResumen(sendResult));
            }
            return notificacionRepository.save(n);
        });
    }

    private static String componerErrorResumen(NotificationSendResult sendResult) {
        String code = sendResult.errorCode() != null ? sendResult.errorCode() : "ERROR";
        String msg = sendResult.errorMessage() != null ? sendResult.errorMessage() : "";
        String combined = code + ": " + msg;
        if (combined.length() <= 500) {
            return combined.trim();
        }
        return combined.substring(0, 500);
    }

    private static String safeMessage(Throwable ex) {
        if (ex == null) {
            return "error desconocido";
        }
        String msg = ex.getMessage();
        if (msg == null || msg.isBlank()) {
            return ex.getClass().getSimpleName();
        }
        String trimmed = msg.trim();
        return trimmed.length() <= 400 ? trimmed : trimmed.substring(0, 400);
    }
}
