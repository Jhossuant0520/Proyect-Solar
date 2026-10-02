-- =====================================================================
-- SOLVIX — FASE 3.15.9.1 Motor de notificaciones (persistencia)
-- Motor: MySQL 8.x
-- Requiere: V1..V14 aplicados
-- =====================================================================
-- Almacena notificaciones PENDIENTES derivadas de eventos de negocio.
-- No implementa envío externo (WhatsApp/Email) en esta fase.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS notificaciones (
    id                      BIGINT         NOT NULL AUTO_INCREMENT,
    tipo_evento             VARCHAR(60)    NOT NULL,
    canal                   VARCHAR(30)    NOT NULL,
    estado                  VARCHAR(30)    NOT NULL,
    plantilla_codigo        VARCHAR(80)    NOT NULL,
    orden_servicio_id       BIGINT         NULL,
    cliente_id              BIGINT         NULL,
    cotizacion_id           BIGINT         NULL,
    destinatario_ref        VARCHAR(120)   NULL,
    asunto                  VARCHAR(255)   NULL,
    cuerpo_renderizado      TEXT           NULL,
    url_consulta_publica    VARCHAR(500)   NULL,
    idempotency_key         VARCHAR(160)   NOT NULL,
    error_resumen           VARCHAR(500)   NULL,
    fecha_creacion          DATETIME(6)    NOT NULL,
    fecha_actualizacion     DATETIME(6)    NOT NULL,
    fecha_envio             DATETIME(6)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_notificaciones_idempotency UNIQUE (idempotency_key),
    CONSTRAINT fk_notificaciones_orden
        FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio (id),
    CONSTRAINT fk_notificaciones_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes (id),
    CONSTRAINT chk_notificaciones_tipo_evento CHECK (tipo_evento IN (
        'ORDEN_RECIBIDA',
        'DIAGNOSTICO_COMPLETADO',
        'COTIZACION_DISPONIBLE',
        'COTIZACION_ADICIONAL_DISPONIBLE',
        'EQUIPO_LISTO',
        'EQUIPO_ENTREGADO'
    )),
    CONSTRAINT chk_notificaciones_canal CHECK (canal IN ('WHATSAPP', 'EMAIL')),
    CONSTRAINT chk_notificaciones_estado CHECK (estado IN (
        'PENDIENTE', 'PROCESANDO', 'ENVIADA', 'FALLIDA', 'CANCELADA'
    ))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_notificaciones_orden ON notificaciones (orden_servicio_id);
CREATE INDEX idx_notificaciones_cliente ON notificaciones (cliente_id);
CREATE INDEX idx_notificaciones_estado ON notificaciones (estado);
CREATE INDEX idx_notificaciones_evento ON notificaciones (tipo_evento);
CREATE INDEX idx_notificaciones_creacion ON notificaciones (fecha_creacion);
