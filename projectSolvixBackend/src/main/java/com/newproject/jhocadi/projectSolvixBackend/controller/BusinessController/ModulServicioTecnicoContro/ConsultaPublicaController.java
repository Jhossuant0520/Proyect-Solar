package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulServicioTecnicoContro;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ConsultaCotizacionPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AccionPublicaCotizacionResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaCotizacionOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaDocumentoPublicoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DocumentoCotizacionComercialService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.ConsultaPublicaCotizacionAccionService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoOrdenServicioService;

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
            cotizacionAccionPublicaService.aprobar(token, body, clientIp(httpRequest)));
    }

    @PostMapping("/ot/{token}/cotizacion/rechazar")
    public ResponseEntity<AccionPublicaCotizacionResponseDTO> rechazarCotizacionOt(
            @PathVariable String token,
            @Valid @RequestBody AccionPublicaCotizacionRequestDTO body,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(
            cotizacionAccionPublicaService.rechazar(token, body, clientIp(httpRequest)));
    }

    @GetMapping("/documento/{tokenDocumento}")
    public ResponseEntity<ConsultaDocumentoPublicoDTO> consultaDocumento(
            @PathVariable String tokenDocumento) {
        return ResponseEntity.ok(documentoService.consultaDocumentoPublico(tokenDocumento));
    }

    private static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "unknown";
    }
}
