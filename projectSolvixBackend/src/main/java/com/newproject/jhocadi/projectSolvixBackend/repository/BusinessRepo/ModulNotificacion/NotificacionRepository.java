package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulNotificacion;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.EstadoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    Optional<Notificacion> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    List<Notificacion> findByOrdenServicioIdOrderByFechaCreacionDesc(Long ordenServicioId);

    List<Notificacion> findByOrdenServicioIdAndTipoEvento(
        Long ordenServicioId,
        TipoEventoNotificacion tipoEvento);

    List<Notificacion> findByEstadoOrderByFechaCreacionAsc(EstadoNotificacion estado);

    /**
     * Claim atómico PENDIENTE → PROCESANDO. Solo una transacción concurrente gana.
     * @return filas actualizadas (0 o 1)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE Notificacion n
           SET n.estado = :procesando,
               n.fechaActualizacion = :ahora,
               n.errorResumen = NULL
         WHERE n.id = :id
           AND n.estado = :pendiente
        """)
    int claimPendienteAProcesando(
        @Param("id") Long id,
        @Param("pendiente") EstadoNotificacion pendiente,
        @Param("procesando") EstadoNotificacion procesando,
        @Param("ahora") LocalDateTime ahora);
}
