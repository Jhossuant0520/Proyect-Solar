package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulServicioTecnicoContro;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaDocumentoPublicoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaOtPublicaDTO;
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

    @GetMapping("/ot/{token}")
    public ResponseEntity<ConsultaOtPublicaDTO> consultaOt(@PathVariable String token) {
        return ResponseEntity.ok(documentoService.consultaOtPublica(token));
    }

    @GetMapping("/documento/{tokenDocumento}")
    public ResponseEntity<ConsultaDocumentoPublicoDTO> consultaDocumento(
            @PathVariable String tokenDocumento) {
        return ResponseEntity.ok(documentoService.consultaDocumentoPublico(tokenDocumento));
    }
}
