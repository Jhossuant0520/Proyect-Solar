package com.newproject.jhocadi.projectSolarFishBackend.controller;

import org.springframework.web.bind.annotation.*;
import com.newproject.jhocadi.projectSolarFishBackend.service.DemandaEnergeticaService;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelDemandaEnergetica;
import java.util.List;

@RestController
@RequestMapping("/api/demandaEnergetica")
@CrossOrigin(origins = "http://localhost:4200")
public class DemandaEnergeticaController {

    private final DemandaEnergeticaService demandaService;

    public DemandaEnergeticaController(DemandaEnergeticaService demandaService) {
        this.demandaService = demandaService;
    }

    // 🔹 Calcular y guardar demanda de una finca
    @PostMapping("/calcular/{fincaId}")
    public modelDemandaEnergetica calcular(@PathVariable Long fincaId) {
        return demandaService.calcularDemandaPorFinca(fincaId);
    }

    // 🔹 Obtener demanda por finca
    @GetMapping("/{fincaId}")
    public modelDemandaEnergetica obtenerPorFinca(@PathVariable Long fincaId) {
        return demandaService.obtenerPorFinca(fincaId);
    }

    // 🔹 Listar todas las demandas
    @GetMapping("/listar")
    public List<modelDemandaEnergetica> listarTodas() {
        return demandaService.listarTodas();
    }

    // 🔹 Eliminar registro
    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        demandaService.eliminar(id);
    }
}
