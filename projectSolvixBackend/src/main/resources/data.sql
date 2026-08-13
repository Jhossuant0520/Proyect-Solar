-- Insertar roles iniciales si no existen
-- id_rol=1: Admin, id_rol=2: Usuario normal (para nuevos registros)
INSERT INTO roles (id_rol, nombre_rol, descripcion_rol) VALUES (1, 'ADMIN', 'Administrador')
ON DUPLICATE KEY UPDATE nombre_rol = nombre_rol;

INSERT INTO roles (id_rol, nombre_rol, descripcion_rol) VALUES (2, 'USUARIO', 'Usuario normal')
ON DUPLICATE KEY UPDATE nombre_rol = nombre_rol;
