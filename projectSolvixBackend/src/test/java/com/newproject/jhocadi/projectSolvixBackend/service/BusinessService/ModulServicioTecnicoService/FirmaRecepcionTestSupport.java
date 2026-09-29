package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;

/**
 * Helper de tests: firma PNG mínima para recepción firmada (D.2).
 */
public final class FirmaRecepcionTestSupport {

    public static final String PNG_1X1_DATA_URL =
        "data:image/png;base64,"
            + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    private FirmaRecepcionTestSupport() {
    }

    public static void aplicarFirmaRecepcion(OrdenServicioRequestDTO request) {
        request.setClienteConfirmoRecepcion(true);
        request.setNombreFirmanteRecepcion("Firmante Test");
        request.setDocumentoFirmanteRecepcion("CC-TEST");
        request.setFirmaBase64Recepcion(PNG_1X1_DATA_URL);
    }
}
