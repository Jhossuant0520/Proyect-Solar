package com.newproject.jhocadi.projectSolarFishBackend.controller.BusinessController.ModulDemandaReciboCon;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.RequestDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.ResponseDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.service.BusinessService.ModulDemandaReciboService.ServiceDemandaRecibo;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/demanda-recibo")
@CrossOrigin(origins = "http://localhost:4200")
public class ControllerDemandaRecibo {

    @Autowired
    private ServiceDemandaRecibo serviceDemandaRecibo;

    // Endpoint existente — solo calcula, no guarda
    @PostMapping("/calcular")
    public ResponseEntity<ResponseDemandaRecibo> calcular(
            @Valid @RequestBody RequestDemandaRecibo request) {
        return ResponseEntity.ok(serviceDemandaRecibo.calcularDemandaEnergetica(request));
    }

    // Nuevo endpoint — calcula Y guarda vinculado al usuario autenticado
    @PostMapping("/calcular-y-guardar")
    public ResponseEntity<ResponseDemandaRecibo> calcularYGuardar(
            @Valid @RequestBody RequestDemandaRecibo request,
            Principal principal) {

        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesión para guardar el cálculo.");
        }

        return ResponseEntity.ok(
                serviceDemandaRecibo.calcularYGuardar(request, principal.getName())
        );
    }
}