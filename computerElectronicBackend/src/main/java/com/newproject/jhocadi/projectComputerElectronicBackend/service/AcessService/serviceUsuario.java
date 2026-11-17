package com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.CambiarPasswordDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RegistroRequestDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.UsuarioAdminWriteDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.UsuarioResponseDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class serviceUsuario {

    private final repositoryUsuario usuarioRepo;
    private final repositoryRolUsuario rolRepo;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final FotoPerfilService fotoPerfilService;

    public void actualizarUltimoLogin(modelUsuario usuario) {
        if (usuario != null) {
            usuarioRepo.save(usuario); // ya tiene el nuevo valor en el campo
        }
    }
    

    public modelUsuario guardarUsuario(modelUsuario usuario) {
        if (usuario == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud no puede ser nulo");
        }
        usuario.setPasswordUsuario(passwordEncoder.encode(usuario.getPasswordUsuario())); // Encriptar contraseña
        return usuarioRepo.save(usuario);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<UsuarioResponseDTO> listarUsuariosAdmin() {
        return usuarioRepo.findAll().stream().map(UsuarioResponseDTO::fromEntity).toList();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public UsuarioResponseDTO obtenerUsuarioAdmin(Integer id) {
        return UsuarioResponseDTO.fromEntity(obtenerEntidadPorId(id));
    }

    @org.springframework.transaction.annotation.Transactional
    public UsuarioResponseDTO crearUsuarioAdmin(UsuarioAdminWriteDTO dto) {
        if (dto.getPasswordUsuario() == null || dto.getPasswordUsuario().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña es obligatoria al crear el usuario.");
        }
        String username = dto.getNombreUsuario().trim();
        String email = dto.getEmail().trim();
        if (usuarioRepo.findByNombreUsuario(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        if (usuarioRepo.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya está registrado");
        }

        modelRolUsuario rol = resolverRol(dto.getIdRol());
        modelUsuario usuario = modelUsuario.builder()
            .nombreUsuario(username)
            .email(email)
            .passwordUsuario(passwordEncoder.encode(dto.getPasswordUsuario()))
            .activo(Boolean.TRUE.equals(dto.getActivo()))
            .emailVerificado(true)
            .rol(rol)
            .build();

        return UsuarioResponseDTO.fromEntity(usuarioRepo.save(usuario));
    }

    @org.springframework.transaction.annotation.Transactional
    public UsuarioResponseDTO actualizarUsuarioAdmin(Integer id, UsuarioAdminWriteDTO dto) {
        modelUsuario existente = obtenerEntidadPorId(id);
        String username = dto.getNombreUsuario().trim();
        String email = dto.getEmail().trim();

        usuarioRepo.findByNombreUsuario(username)
            .filter(u -> !u.getIdUsuario().equals(id))
            .ifPresent(u -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
            });
        usuarioRepo.findByEmail(email)
            .filter(u -> !u.getIdUsuario().equals(id))
            .ifPresent(u -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya está registrado");
            });

        existente.setNombreUsuario(username);
        existente.setEmail(email);
        existente.setActivo(Boolean.TRUE.equals(dto.getActivo()));
        existente.setRol(resolverRol(dto.getIdRol()));

        if (dto.getPasswordUsuario() != null && !dto.getPasswordUsuario().isBlank()) {
            existente.setPasswordUsuario(passwordEncoder.encode(dto.getPasswordUsuario()));
        }

        return UsuarioResponseDTO.fromEntity(usuarioRepo.save(existente));
    }

    @org.springframework.transaction.annotation.Transactional
    public void eliminarUsuarioAdmin(Integer id) {
        if (!usuarioRepo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado");
        }
        usuarioRepo.deleteById(id);
    }

    private modelUsuario obtenerEntidadPorId(Integer id) {
        return usuarioRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    private modelRolUsuario resolverRol(Integer idRol) {
        return rolRepo.findById(idRol)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol no encontrado"));
    }

    public Optional<modelUsuario> validarCredenciales(String nombreUsuario, String passwordPlano) {
        Optional<modelUsuario> optionalUsuario = usuarioRepo.findByNombreUsuario(nombreUsuario);

        if (optionalUsuario.isPresent()) {
            modelUsuario usuario = optionalUsuario.get();
            if (passwordEncoder.matches(passwordPlano, usuario.getPasswordUsuario())) {
                return Optional.of(usuario);
            }
        }

        return Optional.empty(); // credenciales inválidas
    }

    public modelUsuario registrarUsuario(RegistroRequestDTO dto) {
        if (usuarioRepo.findByNombreUsuario(dto.getNombreUsuario()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        if (usuarioRepo.findByEmail(dto.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya está registrado");
        }

        modelRolUsuario rol = rolRepo.findById(2)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol de usuario no configurado"));

        String token = UUID.randomUUID().toString();

        modelUsuario usuario = modelUsuario.builder()
                .nombreUsuario(dto.getNombreUsuario())
                .email(dto.getEmail())
                .passwordUsuario(passwordEncoder.encode(dto.getPasswordUsuario()))
                .activo(true)
                .emailVerificado(false)
                .tokenVerificacion(token)
                .tokenVerificacionExpiracion(LocalDateTime.now().plusHours(24))
                .rol(rol)
                .build();

        modelUsuario usuarioGuardado = usuarioRepo.save(
    Objects.requireNonNull(usuario, "Usuario no puede ser null")
);
        boolean correoEnviado = emailService.enviarEmailVerificacion(dto.getEmail(), token);

        if (!correoEnviado) {
            usuarioGuardado.setEmailVerificado(true);
            usuarioGuardado.setTokenVerificacion(null);
            usuarioGuardado.setTokenVerificacionExpiracion(null);
            usuarioGuardado = usuarioRepo.save(usuarioGuardado);
        }

        return usuarioGuardado;
    }

    public modelUsuario obtenerPorNombreUsuario(String nombreUsuario) {
        return usuarioRepo.findByNombreUsuario(nombreUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    public void cambiarPassword(String nombreUsuario, CambiarPasswordDTO dto) {
        modelUsuario usuario = usuarioRepo.findByNombreUsuario(nombreUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        if (!passwordEncoder.matches(dto.getPasswordActual(), usuario.getPasswordUsuario())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta");
        }

        if (!dto.getPasswordNueva().equals(dto.getConfirmarPasswordNueva())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las contraseñas nuevas no coinciden");
        }

        usuario.setPasswordUsuario(passwordEncoder.encode(dto.getPasswordNueva()));
        usuarioRepo.save(usuario);
    }

    public String actualizarFoto(String nombreUsuario, org.springframework.web.multipart.MultipartFile archivo) {
        modelUsuario usuario = obtenerPorNombreUsuario(nombreUsuario);
        String fotoUrl = fotoPerfilService.guardar(
            usuario.getIdUsuario(), archivo, usuario.getFotoUrl());
        usuario.setFotoUrl(fotoUrl);
        usuarioRepo.save(usuario);
        return fotoUrl;
    }

    public void eliminarFoto(String nombreUsuario) {
        modelUsuario usuario = obtenerPorNombreUsuario(nombreUsuario);
        fotoPerfilService.eliminarArchivosDe(usuario.getIdUsuario(), usuario.getFotoUrl());
        usuario.setFotoUrl(null);
        usuarioRepo.save(usuario);
    }

    public org.springframework.core.io.Resource obtenerArchivoFoto(String nombreArchivo) {
        return fotoPerfilService.cargar(nombreArchivo);
    }

    public @NonNull org.springframework.http.MediaType mediaTypeFoto(String nombreArchivo) {
        return fotoPerfilService.mediaTypeDe(nombreArchivo);
    }
}
