package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import jakarta.annotation.PostConstruct;

/**
 * Almacena PDFs de documentos de OT en filesystem.
 * Sin URL pública: solo acceso vía controlador ADMIN.
 */
@Service
public class DocumentoPdfStorageService {

    private static final Pattern NOMBRE_SEGURO = Pattern.compile(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.pdf$"
    );

    private final Path directorio;

    public DocumentoPdfStorageService(
            @Value("${solvix.servicios.documentos-dir:uploads/servicios/documentos}") String documentosDir) {
        this.directorio = Paths.get(documentosDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void crearDirectorio() throws IOException {
        Files.createDirectories(directorio);
    }

    /**
     * Guarda bytes PDF y retorna el storageKey (UUID.pdf).
     */
    public String guardar(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF vacío.");
        }
        String nombre = UUID.randomUUID() + ".pdf";
        Path destino = directorio.resolve(nombre).normalize();
        if (!destino.startsWith(directorio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nombre de archivo no válido.");
        }
        try {
            Files.write(destino, pdfBytes);
        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar el documento PDF.");
        }
        return nombre;
    }

    public Resource cargar(String storageKey) {
        String seguro = validarStorageKey(storageKey);
        Path archivo = directorio.resolve(seguro).normalize();
        if (!archivo.startsWith(directorio) || !Files.exists(archivo) || !Files.isRegularFile(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento PDF no encontrado.");
        }
        return new FileSystemResource(archivo);
    }

    public byte[] cargarBytes(String storageKey) {
        String seguro = validarStorageKey(storageKey);
        Path archivo = directorio.resolve(seguro).normalize();
        if (!archivo.startsWith(directorio) || !Files.exists(archivo) || !Files.isRegularFile(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento PDF no encontrado.");
        }
        try {
            return Files.readAllBytes(archivo);
        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo leer el documento PDF.");
        }
    }

    private String validarStorageKey(String storageKey) {
        if (storageKey == null || !NOMBRE_SEGURO.matcher(storageKey).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento PDF no encontrado.");
        }
        String lower = storageKey.toLowerCase(Locale.ROOT);
        if (!lower.endsWith(".pdf")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento PDF no encontrado.");
        }
        return storageKey;
    }
}
