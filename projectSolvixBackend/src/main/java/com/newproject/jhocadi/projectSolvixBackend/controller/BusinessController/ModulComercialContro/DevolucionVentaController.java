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

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ReembolsoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucion;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DevolucionVentaService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Consulta de devoluciones. El alta se hace desde la venta:
 * {@code POST /api/v1/ventas/{id}/devoluciones}.
 */
@RestController
@RequestMapping("/api/v1/devoluciones-venta")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DevolucionVentaController {

    private final DevolucionVentaService devolucionVentaService;

    @GetMapping
    public ResponseEntity<List<DevolucionVentaResponseDTO>> listar(
            @RequestParam(required = false) Long ventaId,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) EstadoDevolucionVenta estado,
            @RequestParam(required = false) MotivoDevolucion motivo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(
            devolucionVentaService.listar(ventaId, clienteId, estado, motivo, desde, hasta));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DevolucionVentaResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(devolucionVentaService.obtenerPorId(id));
    }

    @PostMapping("/{id}/reembolsar")
    public ResponseEntity<DevolucionVentaResponseDTO> reembolsar(
            @PathVariable Long id,
            @Valid @RequestBody ReembolsoRequestDTO request) {
        return ResponseEntity.ok(
            devolucionVentaService.registrarReembolso(id, request.getMetodoReembolso()));
    }
}
