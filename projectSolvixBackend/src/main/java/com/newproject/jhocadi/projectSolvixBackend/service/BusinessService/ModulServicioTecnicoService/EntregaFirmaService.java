package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;

import jakarta.annotation.PostConstruct;

/**
 * Almacena firmas PNG de entrega digital en filesystem.
 * MySQL solo guarda la URL relativa en {@code EntregaOrdenServicio.firmaUrl}.
 */
@Service
public class EntregaFirmaService {

    public static final String RUTA_PUBLICA_PREFIJO = "/api/v1/ordenes-servicio/entregas/firmas/";
    private static final long TAMANO_MAXIMO = 500L * 1024;
    private static final Pattern NOMBRE_SEGURO = Pattern.compile(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.png$"
    );
    private static final Pattern DATA_URL_PNG = Pattern.compile(
        "^data:image/png;base64,(.+)$", Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );

    private final Path directorio;

    public EntregaFirmaService(
            @Value("${solvix.servicios.firmas-dir:uploads/servicios/firmas}") String firmasDir) {
        this.directorio = Paths.get(firmasDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void crearDirectorio() throws IOException {
        Files.createDirectories(directorio);
    }

    /**
     * Decodifica Base64 (data URL o crudo), valida PNG y tamaño, guarda con UUID.
     * @return URL relativa pública
     */
    public String guardarDesdeBase64(String firmaBase64) {
        if (firmaBase64 == null || firmaBase64.isBlank()) {
            throw new BusinessException("La firma del cliente es obligatoria.");
        }

        String payload = extraerPayloadBase64(firmaBase64.trim());
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("La firma no es un Base64 válido.");
        }

        if (bytes.length == 0) {
            throw new BusinessException("La firma del cliente es obligatoria.");
        }
        if (bytes.length > TAMANO_MAXIMO) {
            throw new BusinessException("La firma no puede superar 500 KB.");
        }
        if (!esPng(bytes)) {
            throw new BusinessException("La firma debe ser una imagen PNG.");
        }

        String nombre = UUID.randomUUID() + ".png";
        Path destino = directorio.resolve(nombre).normalize();
        if (!destino.startsWith(directorio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nombre de archivo no válido.");
        }

        try {
            Files.write(destino, bytes);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la firma.");
        }

        return RUTA_PUBLICA_PREFIJO + nombre;
    }

    public Resource cargar(String nombreArchivo) {
        String seguro = validarNombrePublico(nombreArchivo);
        Path archivo = directorio.resolve(seguro).normalize();
        if (!archivo.startsWith(directorio) || !Files.exists(archivo) || !Files.isRegularFile(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Firma no encontrada.");
        }
        return new FileSystemResource(archivo);
    }

    public MediaType mediaTypeDe(String nombreArchivo) {
        String lower = nombreArchivo == null ? "" : nombreArchivo.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    private String extraerPayloadBase64(String valor) {
        var matcher = DATA_URL_PNG.matcher(valor);
        if (matcher.matches()) {
            return matcher.group(1).replaceAll("\\s", "");
        }
        String limpio = valor.replaceAll("\\s", "");
        if (limpio.regionMatches(true, 0, "data:", 0, 5)) {
            throw new BusinessException("La firma debe ser una imagen PNG.");
        }
        return limpio;
    }

    private String validarNombrePublico(String nombreArchivo) {
        if (nombreArchivo == null || !NOMBRE_SEGURO.matcher(nombreArchivo).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Firma no encontrada.");
        }
        return nombreArchivo;
    }

    private static boolean esPng(byte[] bytes) {
        return bytes != null
            && bytes.length >= 8
            && (bytes[0] & 0xFF) == 0x89
            && bytes[1] == 0x50
            && bytes[2] == 0x4E
            && bytes[3] == 0x47
            && bytes[4] == 0x0D
            && bytes[5] == 0x0A
            && bytes[6] == 0x1A
            && bytes[7] == 0x0A;
    }
}
