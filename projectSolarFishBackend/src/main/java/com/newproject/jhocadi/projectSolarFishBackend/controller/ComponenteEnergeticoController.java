package com.newproject.jhocadi.projectSolarFishBackend.controller;

import com.newproject.jhocadi.projectSolarFishBackend.model.componenteEnergeticoModel;
import com.newproject.jhocadi.projectSolarFishBackend.service.ComponenteEnergeticoService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;


@RestController
@RequestMapping("/api/componenteEnergetico")
@CrossOrigin(origins = "http://localhost:4200")
public class ComponenteEnergeticoController {

    private final ComponenteEnergeticoService componenteEnergeticoService;

    public ComponenteEnergeticoController(ComponenteEnergeticoService componenteEnergeticoService) {
        this.componenteEnergeticoService = componenteEnergeticoService;
    }

    @PostMapping("/registrar")
    public componenteEnergeticoModel registrar(@RequestBody componenteEnergeticoModel componente) {
        return componenteEnergeticoService.registrar(componente);
    }

    @GetMapping("/listar/{fincaId}")
    public List<componenteEnergeticoModel> listarPorFinca(@PathVariable Long fincaId) {
        return componenteEnergeticoService.listarPorFinca(fincaId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<componenteEnergeticoModel> obtenerPorId(@PathVariable Long id) {
    return componenteEnergeticoService.obtenerPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<componenteEnergeticoModel> actualizar(@PathVariable Long id, @RequestBody componenteEnergeticoModel componente) {
        if (componente == null) {
            return ResponseEntity.badRequest().build();
        }
        return componenteEnergeticoService.actualizar(id, componente)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        componenteEnergeticoService.eliminar(id);
    }
}
