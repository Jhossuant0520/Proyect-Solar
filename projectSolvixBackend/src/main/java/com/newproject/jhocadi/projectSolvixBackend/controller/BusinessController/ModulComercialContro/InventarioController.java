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

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteInventarioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.MovimientoInventarioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.StockProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.InventarioService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/inventario")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class InventarioController {

    private final InventarioService inventarioService;

    @GetMapping("/movimientos")
    public ResponseEntity<List<MovimientoInventarioResponseDTO>> listarMovimientos(
            @RequestParam(required = false) Long productoId,
            @RequestParam(required = false) TipoMovimientoInventario tipo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta) {
        return ResponseEntity.ok(inventarioService.listarMovimientos(productoId, tipo, desde, hasta));
    }

    @PostMapping("/ajustes")
    public ResponseEntity<MovimientoInventarioResponseDTO> registrarAjuste(
            @Valid @RequestBody AjusteInventarioRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(inventarioService.registrarAjuste(request, usuario));
    }

    /**
     * Corrección explícita del costo vigente de un producto. Es la única vía para cambiarlo
     * fuera del flujo de compras: la edición de producto no puede tocarlo. No mueve stock.
     */
    @PostMapping("/ajustes/costo")
    public ResponseEntity<AjusteCostoResponseDTO> registrarAjusteCosto(
            @Valid @RequestBody AjusteCostoRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(inventarioService.registrarAjusteCosto(request, usuario));
    }

    @GetMapping("/ajustes/costo")
    public ResponseEntity<List<AjusteCostoResponseDTO>> listarAjustesCosto(
            @RequestParam(required = false) Long productoId) {
        return ResponseEntity.ok(inventarioService.listarAjustesCosto(productoId));
    }

    @GetMapping("/productos/{productoId}/stock")
    public ResponseEntity<StockProductoResponseDTO> consultarStock(@PathVariable Long productoId) {
        return ResponseEntity.ok(inventarioService.consultarStock(productoId));
    }
}
