package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulServicioTecnicoContro;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.EquipoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/equipos")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class EquipoController {

    private final EquipoService equipoService;

    @PostMapping
    public ResponseEntity<EquipoResponseDTO> crear(@Valid @RequestBody EquipoRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(equipoService.crear(request));
    }

    @GetMapping
    public ResponseEntity<List<EquipoResponseDTO>> listar(
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false, defaultValue = "false") Boolean soloActivos) {
        return ResponseEntity.ok(equipoService.listar(clienteId, soloActivos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipoResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(equipoService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EquipoResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody EquipoRequestDTO request) {
        return ResponseEntity.ok(equipoService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<EquipoResponseDTO> desactivar(@PathVariable Long id) {
        return ResponseEntity.ok(equipoService.desactivar(id));
    }
}
