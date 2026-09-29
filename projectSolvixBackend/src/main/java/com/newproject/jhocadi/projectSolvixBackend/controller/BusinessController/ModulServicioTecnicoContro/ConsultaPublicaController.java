package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulServicioTecnicoContro;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ConsultaCotizacionPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaCotizacionOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaDocumentoPublicoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.DocumentoCotizacionComercialService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoOrdenServicioService;

import lombok.RequiredArgsConstructor;

/**
 * Consulta pública por token (QR). Sin autenticación. Sin PDF ni datos sensibles.
 */
@RestController
@RequestMapping("/api/v1/consulta")
@RequiredArgsConstructor
public class ConsultaPublicaController {

    private final DocumentoOrdenServicioService documentoService;
    private final DocumentoCotizacionComercialService documentoCotizacionComercialService;

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

    @GetMapping("/documento/{tokenDocumento}")
    public ResponseEntity<ConsultaDocumentoPublicoDTO> consultaDocumento(
            @PathVariable String tokenDocumento) {
        return ResponseEntity.ok(documentoService.consultaDocumentoPublico(tokenDocumento));
    }
}
