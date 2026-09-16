package com.newproject.jhocadi.projectSolvixBackend.service.AcessService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;

@Service
public class FotoPerfilService {

    private static final Set<String> TIPOS_PERMITIDOS = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long TAMANO_MAXIMO = 2 * 1024 * 1024;

    private final Path directorio;

    public FotoPerfilService(@Value("${solvix.cuenta.fotos-dir:uploads/avatares}") String fotosDir) {
        this.directorio = Paths.get(fotosDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void crearDirectorio() throws IOException {
        Files.createDirectories(directorio);
    }

    public String guardar(Integer usuarioId, MultipartFile archivo) {
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
        borrarArchivosDe(usuarioId);

        Path destino = directorio.resolve(usuarioId + "." + extension).normalize();
        if (!destino.startsWith(directorio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nombre de archivo no válido.");
        }

        try {
            archivo.transferTo(destino.toFile());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la foto.");
        }

        return "/api/cuenta/avatares/" + usuarioId + "." + extension;
    }

    public void eliminarArchivosDe(Integer usuarioId) {
        borrarArchivosDe(usuarioId);
    }

    public Resource cargar(String nombreArchivo) {
        if (!nombreArchivo.matches("^\\d+\\.(jpg|jpeg|png|webp)$")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto no encontrada.");
        }

        Path archivo = directorio.resolve(nombreArchivo).normalize();
        if (!archivo.startsWith(directorio) || !Files.exists(archivo) || !Files.isRegularFile(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto no encontrada.");
        }

        return new FileSystemResource(archivo);
    }

    public MediaType mediaTypeDe(String nombreArchivo) {
        if (nombreArchivo.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (nombreArchivo.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }

    private void borrarArchivosDe(Integer usuarioId) {
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
