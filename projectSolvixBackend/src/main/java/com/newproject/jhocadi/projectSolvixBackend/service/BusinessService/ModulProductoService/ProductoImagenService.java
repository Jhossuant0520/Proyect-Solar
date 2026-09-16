package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;

/**
 * Almacena imágenes de producto en filesystem.
 * MySQL solo guarda la referencia relativa en {@code Producto.imagenUrl}.
 */
@Service
public class ProductoImagenService {

    public static final String RUTA_PUBLICA_PREFIJO = "/api/v1/productos/imagenes/";
    private static final long TAMANO_MAXIMO = 2L * 1024 * 1024;
    private static final Set<String> TIPOS_PERMITIDOS = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Pattern NOMBRE_SEGURO = Pattern.compile(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.(jpg|jpeg|png|webp)$"
    );

    private final Path directorio;

    public ProductoImagenService(
            @Value("${solvix.productos.imagenes-dir:uploads/productos}") String imagenesDir) {
        this.directorio = Paths.get(imagenesDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void crearDirectorio() throws IOException {
        Files.createDirectories(directorio);
    }

    /**
     * Guarda el archivo con nombre UUID y devuelve la URL relativa pública.
     * No actualiza el producto; eso lo hace {@link ProductoService}.
     */
    public String guardarArchivo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona una imagen.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen debe pesar máximo 2 MB.");
        }

        String extension = detectarExtensionSegura(archivo);
        String nombre = UUID.randomUUID() + "." + extension;
        Path destino = directorio.resolve(nombre).normalize();
        if (!destino.startsWith(directorio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nombre de archivo no válido.");
        }

        try {
            archivo.transferTo(destino.toFile());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la imagen.");
        }

        return RUTA_PUBLICA_PREFIJO + nombre;
    }

    public Resource cargar(String nombreArchivo) {
        String seguro = validarNombrePublico(nombreArchivo);
        Path archivo = directorio.resolve(seguro).normalize();
        if (!archivo.startsWith(directorio) || !Files.exists(archivo) || !Files.isRegularFile(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagen no encontrada.");
        }
        return new FileSystemResource(archivo);
    }

    public MediaType mediaTypeDe(String nombreArchivo) {
        String lower = nombreArchivo.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }

    /** Elimina el archivo solo si la URL es claramente una imagen administrada por SOLVIX. */
    public void eliminarSiEsLocal(String imagenUrl) {
        String nombre = extraerNombreLocal(imagenUrl);
        if (nombre == null) {
            return;
        }
        Path archivo = directorio.resolve(nombre).normalize();
        if (!archivo.startsWith(directorio)) {
            return;
        }
        try {
            Files.deleteIfExists(archivo);
        } catch (IOException ignored) {
            // No bloquear la operación de negocio si el archivo residual no se puede borrar.
        }
    }

    public boolean esImagenLocal(String imagenUrl) {
        return extraerNombreLocal(imagenUrl) != null;
    }

    public String extraerNombreLocal(String imagenUrl) {
        if (imagenUrl == null || imagenUrl.isBlank()) {
            return null;
        }
        String limpio = imagenUrl.trim();
        if (!limpio.startsWith(RUTA_PUBLICA_PREFIJO)) {
            return null;
        }
        String nombre = limpio.substring(RUTA_PUBLICA_PREFIJO.length());
        if (nombre.contains("/") || nombre.contains("\\") || nombre.contains("..")) {
            return null;
        }
        return NOMBRE_SEGURO.matcher(nombre).matches() ? nombre : null;
    }

    private String validarNombrePublico(String nombreArchivo) {
        if (nombreArchivo == null || !NOMBRE_SEGURO.matcher(nombreArchivo).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagen no encontrada.");
        }
        return nombreArchivo;
    }

    /**
     * Detecta el tipo por firma mágica. El Content-Type del cliente solo es una pista secundaria.
     */
    private String detectarExtensionSegura(MultipartFile archivo) {
        byte[] cabecera = leerCabecera(archivo, 16);
        String porFirma = extensionPorFirma(cabecera);
        if (porFirma == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usa una imagen JPG, PNG o WEBP.");
        }

        String rawContentType = archivo.getContentType();
        String contentType = rawContentType == null ? "" : rawContentType.toLowerCase(Locale.ROOT).trim();
        if (!contentType.isEmpty() && !TIPOS_PERMITIDOS.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usa una imagen JPG, PNG o WEBP.");
        }
        if ("image/png".equals(contentType) && !"png".equals(porFirma)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usa una imagen JPG, PNG o WEBP.");
        }
        if ("image/webp".equals(contentType) && !"webp".equals(porFirma)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usa una imagen JPG, PNG o WEBP.");
        }
        if (("image/jpeg".equals(contentType) || "image/jpg".equals(contentType)) && !"jpg".equals(porFirma)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usa una imagen JPG, PNG o WEBP.");
        }

        return porFirma;
    }

    private static byte[] leerCabecera(MultipartFile archivo, int bytes) {
        try (InputStream in = archivo.getInputStream()) {
            return in.readNBytes(bytes);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la imagen.");
        }
    }

    private static String extensionPorFirma(byte[] header) {
        if (header == null || header.length < 3) {
            return null;
        }
        // JPEG
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        // PNG
        if (header.length >= 8
                && (header[0] & 0xFF) == 0x89
                && header[1] == 0x50
                && header[2] == 0x4E
                && header[3] == 0x47
                && header[4] == 0x0D
                && header[5] == 0x0A
                && header[6] == 0x1A
                && header[7] == 0x0A) {
            return "png";
        }
        // WEBP: RIFF....WEBP
        if (header.length >= 12
                && header[0] == 'R'
                && header[1] == 'I'
                && header[2] == 'F'
                && header[3] == 'F'
                && header[8] == 'W'
                && header[9] == 'E'
                && header[10] == 'B'
                && header[11] == 'P') {
            return "webp";
        }
        return null;
    }
}
