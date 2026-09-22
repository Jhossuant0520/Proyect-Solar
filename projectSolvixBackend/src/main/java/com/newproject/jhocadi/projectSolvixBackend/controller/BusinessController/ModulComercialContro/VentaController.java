package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulComercialContro;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DevolucionVentaService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.VentaService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/ventas")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class VentaController {

    private final VentaService ventaService;
    private final DevolucionVentaService devolucionVentaService;

    @PostMapping
    public ResponseEntity<VentaResponseDTO> crear(
            @Valid @RequestBody VentaRequestDTO request,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ventaService.crear(request, nombre(principal)));
    }

    @PostMapping("/{id}/completar")
    public ResponseEntity<VentaResponseDTO> completar(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(ventaService.completar(id, nombre(principal)));
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<VentaResponseDTO> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(ventaService.cancelar(id));
    }

    /** Registra una devolución. La venta conserva su importe histórico original. */
    @PostMapping("/{id}/devoluciones")
    public ResponseEntity<DevolucionVentaResponseDTO> devolver(
            @PathVariable Long id,
            @Valid @RequestBody DevolucionVentaRequestDTO request,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(devolucionVentaService.registrar(id, request, nombre(principal)));
    }

    @GetMapping("/{id}/devoluciones")
    public ResponseEntity<List<DevolucionVentaResponseDTO>> listarDevoluciones(@PathVariable Long id) {
        return ResponseEntity.ok(devolucionVentaService.listarPorVenta(id));
    }

    @GetMapping
    public ResponseEntity<List<VentaResponseDTO>> listar(
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) EstadoVenta estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(ventaService.listar(clienteId, estado, desde, hasta));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VentaResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ventaService.obtenerPorId(id));
    }

    private String nombre(Principal principal) {
        return principal != null ? principal.getName() : null;
    }
}
