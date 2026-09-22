package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulServicioTecnicoContro;

import java.security.Principal;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AsegurarComprobanteRecepcionResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoPdfDescargaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OutcomeAsegurarComprobante;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoOrdenServicioService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/ordenes-servicio/{ordenId}/documentos")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DocumentoOrdenServicioController {

    private final DocumentoOrdenServicioService documentoService;

    @GetMapping
    public ResponseEntity<List<DocumentoOrdenServicioResponseDTO>> listar(@PathVariable Long ordenId) {
        return ResponseEntity.ok(documentoService.listar(ordenId));
    }

    @GetMapping("/{docId}")
    public ResponseEntity<DocumentoOrdenServicioResponseDTO> obtener(
            @PathVariable Long ordenId,
            @PathVariable Long docId) {
        return ResponseEntity.ok(documentoService.obtener(ordenId, docId));
    }

    @GetMapping("/{docId}/pdf")
    public ResponseEntity<Resource> descargarPdf(
            @PathVariable Long ordenId,
            @PathVariable Long docId,
            @RequestParam(defaultValue = "attachment") String disposition) {
        DocumentoPdfDescargaDTO descarga = documentoService.descargarPdf(ordenId, docId);
        String disp = "inline".equalsIgnoreCase(disposition) ? "inline" : "attachment";
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                disp + "; filename=\"" + descarga.getNombreArchivo() + "\"")
            .header("X-Content-SHA256", descarga.getHashSha256() != null ? descarga.getHashSha256() : "")
            .body(descarga.getResource());
    }

    @PostMapping("/comprobante-recepcion")
    public ResponseEntity<AsegurarComprobanteRecepcionResponseDTO> asegurarComprobante(
            @PathVariable Long ordenId,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        AsegurarComprobanteRecepcionResponseDTO body =
            documentoService.asegurarComprobanteRecepcion(ordenId, usuario);
        HttpStatus status = body.getStatus() == OutcomeAsegurarComprobante.GENERATED
            ? HttpStatus.CREATED
            : HttpStatus.OK;
        return ResponseEntity.status(status).body(body);
    }

    @PostMapping("/cotizaciones/{cotizacionId}")
    public ResponseEntity<DocumentoOrdenServicioResponseDTO> generarCotizacion(
            @PathVariable Long ordenId,
            @PathVariable Long cotizacionId,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(documentoService.generarCotizacionPdf(ordenId, cotizacionId, usuario));
    }

    @PostMapping("/acta-entrega")
    public ResponseEntity<DocumentoOrdenServicioResponseDTO> generarActa(
            @PathVariable Long ordenId,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(documentoService.generarActaEntrega(ordenId, usuario));
    }

    @PostMapping("/{docId}/regenerar")
    public ResponseEntity<DocumentoOrdenServicioResponseDTO> regenerar(
            @PathVariable Long ordenId,
            @PathVariable Long docId,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(documentoService.regenerar(ordenId, docId, usuario));
    }
}
