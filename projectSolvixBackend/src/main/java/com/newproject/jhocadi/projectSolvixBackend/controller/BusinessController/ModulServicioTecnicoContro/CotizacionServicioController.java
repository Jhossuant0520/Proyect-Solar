package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulServicioTecnicoContro;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RechazarCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ResumenEconomicoOrdenServicioDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.CotizacionServicioService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/ordenes-servicio/{ordenId}/cotizaciones")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CotizacionServicioController {

    private final CotizacionServicioService cotizacionServicioService;

    @GetMapping
    public ResponseEntity<List<CotizacionServicioResponseDTO>> listar(@PathVariable Long ordenId) {
        return ResponseEntity.ok(cotizacionServicioService.listar(ordenId));
    }

    @GetMapping("/resumen-economico")
    public ResponseEntity<ResumenEconomicoOrdenServicioDTO> resumenEconomico(
            @PathVariable Long ordenId) {
        return ResponseEntity.ok(cotizacionServicioService.resumenEconomico(ordenId));
    }

    @GetMapping("/{cotizacionId}")
    public ResponseEntity<CotizacionServicioResponseDTO> obtener(
            @PathVariable Long ordenId,
            @PathVariable Long cotizacionId) {
        return ResponseEntity.ok(cotizacionServicioService.obtener(ordenId, cotizacionId));
    }

    @PostMapping("/inicial")
    public ResponseEntity<CotizacionServicioResponseDTO> crearInicial(
            @PathVariable Long ordenId,
            @Valid @RequestBody CotizacionServicioRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(cotizacionServicioService.crearInicial(ordenId, request, usuario));
    }

    @PostMapping("/adicional")
    public ResponseEntity<CotizacionServicioResponseDTO> crearAdicional(
            @PathVariable Long ordenId,
            @Valid @RequestBody CotizacionServicioRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(cotizacionServicioService.crearAdicional(ordenId, request, usuario));
    }

    @PutMapping("/{cotizacionId}")
    public ResponseEntity<CotizacionServicioResponseDTO> actualizar(
            @PathVariable Long ordenId,
            @PathVariable Long cotizacionId,
            @Valid @RequestBody CotizacionServicioRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(
            cotizacionServicioService.actualizar(ordenId, cotizacionId, request, usuario));
    }

    @PostMapping("/{cotizacionId}/presentar")
    public ResponseEntity<CotizacionServicioResponseDTO> presentar(
            @PathVariable Long ordenId,
            @PathVariable Long cotizacionId,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(
            cotizacionServicioService.presentar(ordenId, cotizacionId, usuario));
    }

    @PostMapping("/{cotizacionId}/aprobar")
    public ResponseEntity<CotizacionServicioResponseDTO> aprobar(
            @PathVariable Long ordenId,
            @PathVariable Long cotizacionId,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(
            cotizacionServicioService.aprobar(ordenId, cotizacionId, usuario));
    }

    @PostMapping("/{cotizacionId}/rechazar")
    public ResponseEntity<CotizacionServicioResponseDTO> rechazar(
            @PathVariable Long ordenId,
            @PathVariable Long cotizacionId,
            @RequestBody(required = false) @Valid RechazarCotizacionRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        RechazarCotizacionRequestDTO body =
            request != null ? request : new RechazarCotizacionRequestDTO();
        return ResponseEntity.ok(
            cotizacionServicioService.rechazar(ordenId, cotizacionId, body, usuario));
    }

    @DeleteMapping("/{cotizacionId}")
    public ResponseEntity<Void> eliminarBorrador(
            @PathVariable Long ordenId,
            @PathVariable Long cotizacionId,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        cotizacionServicioService.eliminarBorrador(ordenId, cotizacionId, usuario);
        return ResponseEntity.noContent().build();
    }
}
