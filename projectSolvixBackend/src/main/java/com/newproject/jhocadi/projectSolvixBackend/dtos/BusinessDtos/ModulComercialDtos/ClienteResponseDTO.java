package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoCliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClienteResponseDTO {

    private Long id;
    private String nombre;
    private TipoCliente tipoCliente;
    private boolean consumidorFinal;
    private TipoDocumento tipoDocumento;
    private String numeroDocumento;
    private String email;
    private String telefono;
    private String notas;
    private boolean activo;
    private LocalDateTime fechaRegistro;

    public static ClienteResponseDTO fromEntity(Cliente cliente) {
        return ClienteResponseDTO.builder()
            .id(cliente.getId())
            .nombre(cliente.getNombre())
            .tipoCliente(cliente.getTipoCliente())
            .consumidorFinal(cliente.esConsumidorFinal())
            .tipoDocumento(cliente.getTipoDocumento())
            .numeroDocumento(cliente.getNumeroDocumento())
            .email(cliente.getEmail())
            .telefono(cliente.getTelefono())
            .notas(cliente.getNotas())
            .activo(cliente.isActivo())
            .fechaRegistro(cliente.getFechaRegistro())
            .build();
    }
}
