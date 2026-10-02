package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProveedorResponseDTO {

    private Long id;

    /** Alias de compatibilidad FASE 1 / selects de compra. */
    private String nombre;

    private String razonSocial;
    private TipoDocumento tipoDocumento;

    /** Alias de compatibilidad FASE 1. */
    private String documento;

    private String numeroDocumento;
    private String nombreComercial;
    private String direccion;
    private String ciudad;
    private String departamento;
    private String telefono;
    private String telefonoAlternativo;
    private String email;
    private String web;
    private CondicionPagoProveedor condicionPago;
    private Integer diasCredito;

    /** Legacy string; preferir {@link #contactos}. */
    private String contacto;

    private String notas;
    private boolean activo;
    private LocalDateTime fechaRegistro;
    private LocalDateTime fechaActualizacion;
    private List<ContactoProveedorResponseDTO> contactos;

    public static ProveedorResponseDTO fromEntity(Proveedor proveedor) {
        List<ContactoProveedorResponseDTO> contactos = proveedor.getContactos() == null
            ? Collections.emptyList()
            : proveedor.getContactos().stream().map(ContactoProveedorResponseDTO::fromEntity).toList();

        return ProveedorResponseDTO.builder()
            .id(proveedor.getId())
            .nombre(proveedor.getNombre())
            .razonSocial(proveedor.getRazonSocial())
            .tipoDocumento(proveedor.getTipoDocumento())
            .documento(proveedor.getDocumento())
            .numeroDocumento(proveedor.getNumeroDocumento())
            .nombreComercial(proveedor.getNombreComercial())
            .direccion(proveedor.getDireccion())
            .ciudad(proveedor.getCiudad())
            .departamento(proveedor.getDepartamento())
            .telefono(proveedor.getTelefono())
            .telefonoAlternativo(proveedor.getTelefonoAlternativo())
            .email(proveedor.getEmail())
            .web(proveedor.getWeb())
            .condicionPago(proveedor.getCondicionPago())
            .diasCredito(proveedor.getDiasCredito())
            .contacto(proveedor.getContacto())
            .notas(proveedor.getNotas())
            .activo(proveedor.isActivo())
            .fechaRegistro(proveedor.getFechaRegistro())
            .fechaActualizacion(proveedor.getFechaActualizacion())
            .contactos(contactos)
            .build();
    }
}
