package com.newproject.jhocadi.projectSolarFishBackend.controller.BusinessController.ModulSolarContro;

import com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulSolarModel.modelPanelSolares;
import com.newproject.jhocadi.projectSolarFishBackend.service.BusinessService.ModulSolarService.ServicePaneles;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/paneles")
@CrossOrigin(origins = "http://localhost:4200")
public class ControllerPaneles {

    private final ServicePaneles servicePaneles;

    // Nota: Se eliminó @Autowired porque Spring lo gestiona solo automáticamente
    public ControllerPaneles(ServicePaneles servicePaneles) {
        this.servicePaneles = servicePaneles;
    }

    @PostMapping("/registrar")
    public ResponseEntity<modelPanelSolares> registrar(@RequestBody modelPanelSolares panel, Principal principal) {
        try {
            modelPanelSolares nuevoPanel = servicePaneles.registrar(panel, principal);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevoPanel);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error al registrar el panel solar", e);
        }
    }

    // 🌟 NUEVO: Endpoint para listar todos los paneles que te faltaba conectar
    @GetMapping
    public ResponseEntity<List<modelPanelSolares>> listarTodos() {
        try {
            List<modelPanelSolares> paneles = servicePaneles.listarTodos();
            return ResponseEntity.ok(paneles);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al obtener la lista", e);
        }
    }

    // ✨ CORRECCIÓN: Se fusionaron "listar" y "obtener" en un solo método GET semántico
    @GetMapping("/{id}")
    public ResponseEntity<modelPanelSolares> obtenerPorId(@PathVariable Long id) {
        try {
            modelPanelSolares panel = servicePaneles.obtenerPorId(id);
            return ResponseEntity.ok(panel);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Panel solar no encontrado", e);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<modelPanelSolares> actualizar(@PathVariable Long id, @RequestBody modelPanelSolares panel) {
        try {
            modelPanelSolares panelActualizado = servicePaneles.actualizar(id, panel);
            return ResponseEntity.ok(panelActualizado);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error al actualizar el panel solar", e);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        try {
            servicePaneles.eliminar(id);
            return ResponseEntity.noContent().build(); // Devuelve un 204 No Content limpio
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Panel solar no encontrado", e);
        }
    }
}