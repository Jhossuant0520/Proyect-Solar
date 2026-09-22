package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulServicioTecnicoContro;

import java.security.Principal;
import java.util.List;

import org.springframework.core.io.Resource;
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

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarDiagnosticoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarReparacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsumirRepuestoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DevolverRepuestoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EntregaOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.HistorialEstadoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarEntregaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarEntregaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarNuevaFallaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.TransicionOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.EntregaFirmaService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.OrdenServicioRepuestoService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.OrdenServicioService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/ordenes-servicio")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class OrdenServicioController {

    private final OrdenServicioService ordenServicioService;
    private final OrdenServicioRepuestoService ordenServicioRepuestoService;
    private final EntregaFirmaService entregaFirmaService;

    @PostMapping
    public ResponseEntity<OrdenServicioResponseDTO> crear(
            @Valid @RequestBody OrdenServicioRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(ordenServicioService.crear(request, usuario));
    }

    @GetMapping
    public ResponseEntity<List<OrdenServicioResponseDTO>> listar(
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) Long equipoId,
            @RequestParam(required = false) EstadoOrdenServicio estado) {
        return ResponseEntity.ok(ordenServicioService.listar(clienteId, equipoId, estado));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrdenServicioResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ordenServicioService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrdenServicioResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody OrdenServicioRequestDTO request) {
        return ResponseEntity.ok(ordenServicioService.actualizar(id, request));
    }

    @PostMapping("/{id}/estado")
    public ResponseEntity<TransicionOrdenServicioResponseDTO> cambiarEstado(
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoOrdenServicioRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(ordenServicioService.cambiarEstado(id, request, usuario));
    }

    @PostMapping("/{id}/diagnostico/completar")
    public ResponseEntity<TransicionOrdenServicioResponseDTO> completarDiagnostico(
            @PathVariable Long id,
            @Valid @RequestBody CompletarDiagnosticoRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(ordenServicioService.completarDiagnostico(id, request, usuario));
    }

    @PostMapping("/{id}/reparacion/completar")
    public ResponseEntity<TransicionOrdenServicioResponseDTO> completarReparacion(
            @PathVariable Long id,
            @Valid @RequestBody CompletarReparacionRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(ordenServicioService.completarReparacion(id, request, usuario));
    }

    @PostMapping("/{id}/nueva-falla")
    public ResponseEntity<TransicionOrdenServicioResponseDTO> registrarNuevaFalla(
            @PathVariable Long id,
            @Valid @RequestBody RegistrarNuevaFallaRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(ordenServicioService.registrarNuevaFalla(id, request, usuario));
    }

    @PostMapping("/{id}/entrega")
    public ResponseEntity<RegistrarEntregaResponseDTO> registrarEntrega(
            @PathVariable Long id,
            @Valid @RequestBody RegistrarEntregaRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ordenServicioService.registrarEntrega(id, request, usuario));
    }

    @GetMapping("/{id}/entrega")
    public ResponseEntity<EntregaOrdenServicioResponseDTO> obtenerEntrega(@PathVariable Long id) {
        return ResponseEntity.ok(ordenServicioService.obtenerEntrega(id));
    }

    @GetMapping("/entregas/firmas/{nombreArchivo:.+}")
    public ResponseEntity<Resource> verFirma(@PathVariable String nombreArchivo) {
        Resource archivo = entregaFirmaService.cargar(nombreArchivo);
        return ResponseEntity.ok()
            .contentType(entregaFirmaService.mediaTypeDe(nombreArchivo))
            .header("Cache-Control", "private, max-age=3600")
            .body(archivo);
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<HistorialEstadoOrdenServicioResponseDTO>> listarHistorial(@PathVariable Long id) {
        return ResponseEntity.ok(ordenServicioService.listarHistorial(id));
    }

    @GetMapping("/{id}/repuestos")
    public ResponseEntity<List<RepuestoOrdenServicioResponseDTO>> listarRepuestos(@PathVariable Long id) {
        return ResponseEntity.ok(ordenServicioRepuestoService.listar(id));
    }

    @PostMapping("/{id}/repuestos")
    public ResponseEntity<RepuestoOrdenServicioResponseDTO> planificarRepuesto(
            @PathVariable Long id,
            @Valid @RequestBody RepuestoOrdenServicioRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ordenServicioRepuestoService.planificar(id, request));
    }

    @PutMapping("/{id}/repuestos/{repuestoId}")
    public ResponseEntity<RepuestoOrdenServicioResponseDTO> actualizarRepuesto(
            @PathVariable Long id,
            @PathVariable Long repuestoId,
            @Valid @RequestBody RepuestoOrdenServicioRequestDTO request) {
        return ResponseEntity.ok(
            ordenServicioRepuestoService.actualizarPlanificacion(id, repuestoId, request));
    }

    @DeleteMapping("/{id}/repuestos/{repuestoId}")
    public ResponseEntity<RepuestoOrdenServicioResponseDTO> anularRepuesto(
            @PathVariable Long id,
            @PathVariable Long repuestoId) {
        return ResponseEntity.ok(ordenServicioRepuestoService.anular(id, repuestoId));
    }

    @PostMapping("/{id}/repuestos/{repuestoId}/consumir")
    public ResponseEntity<RepuestoOrdenServicioResponseDTO> consumirRepuesto(
            @PathVariable Long id,
            @PathVariable Long repuestoId,
            @Valid @RequestBody ConsumirRepuestoRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(
            ordenServicioRepuestoService.consumir(id, repuestoId, request, usuario));
    }

    @PostMapping("/{id}/repuestos/{repuestoId}/devolver")
    public ResponseEntity<RepuestoOrdenServicioResponseDTO> devolverRepuesto(
            @PathVariable Long id,
            @PathVariable Long repuestoId,
            @Valid @RequestBody DevolverRepuestoRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(
            ordenServicioRepuestoService.devolver(id, repuestoId, request, usuario));
    }
}
