package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulComercialContro;

import java.security.Principal;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DocumentoCotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PaginaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoPdfDescargaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RechazarCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.CotizacionComercialService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DocumentoCotizacionComercialService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/cotizaciones-comerciales")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CotizacionComercialController {

    private final CotizacionComercialService cotizacionService;
    private final DocumentoCotizacionComercialService documentoService;

    @GetMapping
    public ResponseEntity<PaginaResponseDTO<CotizacionComercialResumenDTO>> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoCotizacionComercial estado,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false, defaultValue = "0") Integer pagina,
            @RequestParam(required = false, defaultValue = "20") Integer tamano) {
        return ResponseEntity.ok(cotizacionService.listar(q, estado, clienteId, pagina, tamano));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CotizacionComercialResponseDTO> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(cotizacionService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<CotizacionComercialResponseDTO> crear(
            @Valid @RequestBody CotizacionComercialRequestDTO request,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(cotizacionService.crear(request, nombre(principal)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CotizacionComercialResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody CotizacionComercialRequestDTO request,
            Principal principal) {
        return ResponseEntity.ok(cotizacionService.actualizar(id, request, nombre(principal)));
    }

    @PostMapping("/{id}/presentar")
    public ResponseEntity<CotizacionComercialResponseDTO> presentar(
            @PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(cotizacionService.presentar(id, nombre(principal)));
    }

    @PostMapping("/{id}/aprobar")
    public ResponseEntity<CotizacionComercialResponseDTO> aprobar(
            @PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(cotizacionService.aprobar(id, nombre(principal)));
    }

    @PostMapping("/{id}/rechazar")
    public ResponseEntity<CotizacionComercialResponseDTO> rechazar(
            @PathVariable Long id,
            @RequestBody(required = false) @Valid RechazarCotizacionRequestDTO request,
            Principal principal) {
        String motivo = request != null ? request.getObservacion() : null;
        return ResponseEntity.ok(cotizacionService.rechazar(id, motivo, nombre(principal)));
    }

    @PostMapping("/{id}/anular")
    public ResponseEntity<CotizacionComercialResponseDTO> anular(
            @PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(cotizacionService.anular(id, nombre(principal)));
    }

    @GetMapping("/{id}/documentos")
    public ResponseEntity<List<DocumentoCotizacionComercialResponseDTO>> listarDocumentos(
            @PathVariable Long id) {
        return ResponseEntity.ok(documentoService.listar(id));
    }

    /** Regenera el PDF con el contenido vigente (p. ej. si falló al presentar). */
    @PostMapping("/{id}/documentos")
    public ResponseEntity<DocumentoCotizacionComercialResponseDTO> generarDocumento(
            @PathVariable Long id, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(documentoService.generar(id, nombre(principal)));
    }

    @GetMapping("/{id}/documentos/{documentoId}/pdf")
    public ResponseEntity<Resource> descargarPdf(
            @PathVariable Long id,
            @PathVariable Long documentoId,
            @RequestParam(defaultValue = "attachment") String disposition) {
        DocumentoPdfDescargaDTO descarga = documentoService.descargar(id, documentoId);
        String disp = "inline".equalsIgnoreCase(disposition) ? "inline" : "attachment";
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                disp + "; filename=\"" + descarga.getNombreArchivo() + "\"")
            .header("X-Content-SHA256", descarga.getHashSha256() != null ? descarga.getHashSha256() : "")
            .body(descarga.getResource());
    }

    private String nombre(Principal principal) {
        return principal != null ? principal.getName() : null;
    }
}
