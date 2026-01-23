package com.newproject.jhocadi.projectSolarFishBackend.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;
import com.newproject.jhocadi.projectSolarFishBackend.service.FincaService;
import com.newproject.jhocadi.projectSolarFishBackend.model.fincaModel;
import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/fincas")
@CrossOrigin(origins = "http://localhost:4200")

public class FincaController {
    
    private final FincaService fincaService;

    public FincaController(FincaService fincaService) {
        this.fincaService = fincaService;
    }

    @PostMapping("/registrar")
    public fincaModel registrarFinca(@RequestBody fincaModel finca) {
        return fincaService.registrarFinca(finca);
    }
    @GetMapping("/listar")
    public List<fincaModel> listarFincas() {
        return fincaService.listarFincas();
    }
    @GetMapping("/{id}")
    public ResponseEntity<fincaModel> obtenerFincaPorId(@PathVariable Long id) {
        return fincaService.obtenerFincaPorId(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    @PutMapping("/{id}")
    public ResponseEntity<fincaModel> actualizarFinca(@PathVariable Long id, @RequestBody fincaModel finca) {
        return fincaService.obtenerFincaPorId(id)
                .map(existingFinca -> {
                    existingFinca.setNombreFinca(finca.getNombreFinca());
                    existingFinca.setUbicacionFinca(finca.getUbicacionFinca());
                    existingFinca.setPropietarioFinca(finca.getPropietarioFinca());
                    existingFinca.setSuperficieFinca(finca.getSuperficieFinca());
                    existingFinca.setActividadPrincipal(finca.getActividadPrincipal());
                    fincaModel saved = fincaService.registrarFinca(existingFinca);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}")
    public void eliminarFinca(@PathVariable Long id) {
        fincaService.eliminarFinca(id);
    }
}
