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

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.CompraService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DevolucionCompraService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/compras")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CompraController {

    private final CompraService compraService;
    private final DevolucionCompraService devolucionCompraService;

    @PostMapping
    public ResponseEntity<CompraResponseDTO> crear(
            @Valid @RequestBody CompraRequestDTO request,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(compraService.crear(request, nombre(principal)));
    }

    @PostMapping("/{id}/completar")
    public ResponseEntity<CompraResponseDTO> completar(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(compraService.completar(id, nombre(principal)));
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<CompraResponseDTO> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(compraService.cancelar(id));
    }

    /** Registra la devolución al proveedor. La compra conserva su total histórico. */
    @PostMapping("/{id}/devoluciones")
    public ResponseEntity<DevolucionCompraResponseDTO> devolver(
            @PathVariable Long id,
            @Valid @RequestBody DevolucionCompraRequestDTO request,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(devolucionCompraService.registrar(id, request, nombre(principal)));
    }

    @GetMapping("/{id}/devoluciones")
    public ResponseEntity<List<DevolucionCompraResponseDTO>> listarDevoluciones(@PathVariable Long id) {
        return ResponseEntity.ok(devolucionCompraService.listarPorCompra(id));
    }

    @GetMapping
    public ResponseEntity<List<CompraResponseDTO>> listar(
            @RequestParam(required = false) Long proveedorId,
            @RequestParam(required = false) EstadoCompra estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(compraService.listar(proveedorId, estado, desde, hasta));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompraResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(compraService.obtenerPorId(id));
    }

    private String nombre(Principal principal) {
        return principal != null ? principal.getName() : null;
    }
}
