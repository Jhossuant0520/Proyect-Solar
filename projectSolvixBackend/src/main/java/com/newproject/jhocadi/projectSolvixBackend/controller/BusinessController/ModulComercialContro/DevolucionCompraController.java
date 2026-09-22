package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulComercialContro;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
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

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ReembolsoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DevolucionCompraService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Consulta de devoluciones a proveedor. El alta se hace desde la compra:
 * {@code POST /api/v1/compras/{id}/devoluciones}.
 */
@RestController
@RequestMapping("/api/v1/devoluciones-compra")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DevolucionCompraController {

    private final DevolucionCompraService devolucionCompraService;

    @GetMapping
    public ResponseEntity<List<DevolucionCompraResponseDTO>> listar(
            @RequestParam(required = false) Long compraId,
            @RequestParam(required = false) Long proveedorId,
            @RequestParam(required = false) EstadoDevolucionCompra estado,
            @RequestParam(required = false) MotivoDevolucionCompra motivo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(
            devolucionCompraService.listar(compraId, proveedorId, estado, motivo, desde, hasta));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DevolucionCompraResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(devolucionCompraService.obtenerPorId(id));
    }

    @PostMapping("/{id}/reembolsar")
    public ResponseEntity<DevolucionCompraResponseDTO> reembolsar(
            @PathVariable Long id,
            @Valid @RequestBody ReembolsoRequestDTO request) {
        return ResponseEntity.ok(
            devolucionCompraService.registrarReembolso(id, request.getMetodoReembolso()));
    }
}
