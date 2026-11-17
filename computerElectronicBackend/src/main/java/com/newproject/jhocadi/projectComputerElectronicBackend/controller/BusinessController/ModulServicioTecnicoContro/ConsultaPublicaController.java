package com.newproject.jhocadi.projectComputerElectronicBackend.controller.BusinessController.ModulServicioTecnicoContro;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.BusinessDtos.ModulComercialDtos.ConsultaCotizacionPublicaDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionRequestDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionResponseDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaCotizacionOtPublicaDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaDocumentoPublicoDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaOtPublicaDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.ClientIpResolver;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulComercialService.DocumentoCotizacionComercialService;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulServicioTecnicoService.ConsultaPublicaCotizacionAccionService;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoOrdenServicioService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Consulta pública por token (QR). GET sin autenticación.
 * Acciones sensibles de cotización: POST con verificación documento+teléfono.
 */
@RestController
@RequestMapping("/api/v1/consulta")
@RequiredArgsConstructor
public class ConsultaPublicaController {

    private final DocumentoOrdenServicioService documentoService;
    private final DocumentoCotizacionComercialService documentoCotizacionComercialService;
    private final ConsultaPublicaCotizacionAccionService cotizacionAccionPublicaService;
    private final ClientIpResolver clientIpResolver;

    @GetMapping("/cotizacion/{token}")
    public ResponseEntity<ConsultaCotizacionPublicaDTO> consultaCotizacion(@PathVariable String token) {
        return ResponseEntity.ok(documentoCotizacionComercialService.consultaPublica(token));
    }

    @GetMapping("/ot/{token}")
    public ResponseEntity<ConsultaOtPublicaDTO> consultaOt(@PathVariable String token) {
        return ResponseEntity.ok(documentoService.consultaOtPublica(token));
    }

    /** Cotización de OT en solo lectura (PENDIENTE_APROBACION). */
    @GetMapping("/ot/{token}/cotizacion")
    public ResponseEntity<ConsultaCotizacionOtPublicaDTO> consultaCotizacionOt(
            @PathVariable String token) {
        return ResponseEntity.ok(documentoService.consultaCotizacionOtPublica(token));
    }

    @PostMapping("/ot/{token}/cotizacion/aprobar")
    public ResponseEntity<AccionPublicaCotizacionResponseDTO> aprobarCotizacionOt(
            @PathVariable String token,
            @Valid @RequestBody AccionPublicaCotizacionRequestDTO body,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
            cotizacionAccionPublicaService.aprobar(token, body, clientIpResolver.resolve(httpRequest)));
    }

    @PostMapping("/ot/{token}/cotizacion/rechazar")
    public ResponseEntity<AccionPublicaCotizacionResponseDTO> rechazarCotizacionOt(
            @PathVariable String token,
            @Valid @RequestBody AccionPublicaCotizacionRequestDTO body,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
            cotizacionAccionPublicaService.rechazar(token, body, clientIpResolver.resolve(httpRequest)));
    }

    @GetMapping("/documento/{tokenDocumento}")
    public ResponseEntity<ConsultaDocumentoPublicoDTO> consultaDocumento(
            @PathVariable String tokenDocumento) {
        return ResponseEntity.ok(documentoService.consultaDocumentoPublico(tokenDocumento));
    }
}
