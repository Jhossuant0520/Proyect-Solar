package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulComercialContro;

import java.security.Principal;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CuentaPorPagarResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PagoCxPRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PagoCxPResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCuentaPorPagar;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.CxPService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cxp")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CxPController {

    private final CxPService cxpService;

    @GetMapping
    public ResponseEntity<Page<CuentaPorPagarResponseDTO>> listar(
            @RequestParam(required = false) Long proveedorId,
            @RequestParam(required = false) EstadoCuentaPorPagar estado,
            @RequestParam(required = false) Boolean vencida,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(cxpService.listar(proveedorId, estado, vencida, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CuentaPorPagarResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(cxpService.obtenerPorId(id));
    }

    @GetMapping("/por-compra/{compraId}")
    public ResponseEntity<CuentaPorPagarResponseDTO> obtenerPorCompra(@PathVariable Long compraId) {
        return ResponseEntity.ok(cxpService.obtenerPorCompraId(compraId));
    }

    @GetMapping("/{id}/pagos")
    public ResponseEntity<List<PagoCxPResponseDTO>> listarPagos(@PathVariable Long id) {
        return ResponseEntity.ok(cxpService.listarPagos(id));
    }

    @PostMapping("/{id}/pagos")
    public ResponseEntity<CuentaPorPagarResponseDTO> registrarPago(
            @PathVariable Long id,
            @Valid @RequestBody PagoCxPRequestDTO request,
            Principal principal) {

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(cxpService.registrarPago(id, request, nombre(principal)));
    }

    private String nombre(Principal principal) {
        return principal != null ? principal.getName() : null;
    }
}
