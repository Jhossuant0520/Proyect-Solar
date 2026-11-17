package com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class FotoPerfilService {

    public static final String RUTA_PUBLICA_PREFIJO = "/api/cuenta/avatares/";

    private static final Set<String> TIPOS_PERMITIDOS = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long TAMANO_MAXIMO = 2 * 1024 * 1024;
    /** Nuevos archivos: UUID (no enumerable). Legacy: {idUsuario}.ext. */
    private static final Pattern NOMBRE_SEGURO = Pattern.compile(
        "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|\\d+)\\.(jpg|jpeg|png|webp)$"
    );

    private final Path directorio;

    public FotoPerfilService(@Value("${app.storage.account.photos-dir:uploads/avatares}") String fotosDir) {
        this.directorio = Paths.get(fotosDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void crearDirectorio() throws IOException {
        Files.createDirectories(directorio);
    }

    /**
     * Guarda con nombre UUID y elimina la foto anterior (legacy por id o UUID previo).
     */
    public String guardar(Integer usuarioId, MultipartFile archivo, String fotoUrlAnterior) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona una imagen.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La foto debe pesar máximo 2 MB.");
        }

        String rawContentType = archivo.getContentType();
        String contentType = rawContentType == null ? "" : rawContentType.toLowerCase(Locale.ROOT);
        if (!TIPOS_PERMITIDOS.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usa una imagen JPG, PNG o WEBP.");
        }

        String extension = extensionDe(contentType);
        eliminarPorUrlPublica(fotoUrlAnterior);
        if (usuarioId != null) {
            borrarArchivosLegacyDe(usuarioId);
        }

        String nombre = UUID.randomUUID() + "." + extension;
        Path destino = directorio.resolve(nombre).normalize();
        if (!destino.startsWith(directorio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nombre de archivo no válido.");
        }

        try {
            archivo.transferTo(destino);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la foto.");
        }

        return RUTA_PUBLICA_PREFIJO + nombre;
    }

    public void eliminarArchivosDe(Integer usuarioId, String fotoUrl) {
        eliminarPorUrlPublica(fotoUrl);
        if (usuarioId != null) {
            borrarArchivosLegacyDe(usuarioId);
        }
    }

    public Resource cargar(String nombreArchivo) {
        if (nombreArchivo == null || !NOMBRE_SEGURO.matcher(nombreArchivo).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto no encontrada.");
        }

        Path archivo = directorio.resolve(nombreArchivo).normalize();
        if (!archivo.startsWith(directorio) || !Files.exists(archivo) || !Files.isRegularFile(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto no encontrada.");
        }

        return new FileSystemResource(archivo);
    }

    public @NonNull MediaType mediaTypeDe(String nombreArchivo) {
        MediaType tipo;
        if (nombreArchivo != null && nombreArchivo.toLowerCase(Locale.ROOT).endsWith(".png")) {
            tipo = MediaType.IMAGE_PNG;
        } else if (nombreArchivo != null && nombreArchivo.toLowerCase(Locale.ROOT).endsWith(".webp")) {
            tipo = MediaType.parseMediaType("image/webp");
        } else {
            tipo = MediaType.IMAGE_JPEG;
        }
        return Objects.requireNonNull(tipo);
    }

    private void eliminarPorUrlPublica(String fotoUrl) {
        if (fotoUrl == null || fotoUrl.isBlank()) {
            return;
        }
        String nombre = fotoUrl;
        if (nombre.startsWith(RUTA_PUBLICA_PREFIJO)) {
            nombre = nombre.substring(RUTA_PUBLICA_PREFIJO.length());
        } else {
            int slash = nombre.lastIndexOf('/');
            if (slash >= 0) {
                nombre = nombre.substring(slash + 1);
            }
        }
        if (!NOMBRE_SEGURO.matcher(nombre).matches()) {
            return;
        }
        Path archivo = directorio.resolve(nombre).normalize();
        if (!archivo.startsWith(directorio)) {
            return;
        }
        try {
            Files.deleteIfExists(archivo);
        } catch (IOException ignored) {
            // Residual: la nueva foto se guarda igual.
        }
    }

    private void borrarArchivosLegacyDe(Integer usuarioId) {
        for (String extension : new String[] { "jpg", "jpeg", "png", "webp" }) {
            try {
                Files.deleteIfExists(directorio.resolve(usuarioId + "." + extension));
            } catch (IOException ignored) {
                // Si un archivo residual no se puede borrar, el nuevo archivo igual se guarda.
            }
        }
    }

    private static String extensionDe(String contentType) {
        if ("image/png".equals(contentType)) {
            return "png";
        }
        if ("image/webp".equals(contentType)) {
            return "webp";
        }
        return "jpg";
    }
}
