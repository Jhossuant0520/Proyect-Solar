package com.newproject.jhocadi.projectSolarFishBackend.controller.BusinessController.ModulHSPContro;


import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulHSPDtos.RequestHSP;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulHSPDtos.ResponseHSP;
import com.newproject.jhocadi.projectSolarFishBackend.service.BusinessService.ModulHspService.ServiceImpHSP;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/hsp")
@CrossOrigin(origins = "http://localhost:4200")
public class ControllerHSP {

    @Autowired
    private ServiceImpHSP service;

    // Vista previa sin guardar (para el paso 1 del stepper)
    @PostMapping("/calcular")
    public ResponseEntity<ResponseHSP> calcular(@RequestBody RequestHSP request) {
        return ResponseEntity.ok(service.calcular(request));
    }

    // Confirmar y guardar vinculado al usuario
    @PostMapping("/calcular-y-guardar")
    public ResponseEntity<ResponseHSP> calcularYGuardar(
            @RequestBody RequestHSP request,
            Principal principal) {

        if (principal == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Debes iniciar sesión para guardar el cálculo.");

        return ResponseEntity.ok(service.calcularYGuardar(request, principal.getName()));
    }
}