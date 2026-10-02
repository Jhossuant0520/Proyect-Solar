package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.util.List;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProveedorRequestDTO {

    /**
     * Alias legacy: si llega sin {@link #razonSocial}, se usa como razón social.
     */
    @Size(max = 150)
    private String nombre;

    @Size(max = 150)
    private String razonSocial;

    private TipoDocumento tipoDocumento;

    /** Alias legacy del número de documento. */
    @Size(max = 40)
    private String documento;

    @Size(max = 40)
    private String numeroDocumento;

    @Size(max = 150)
    private String nombreComercial;

    @Size(max = 255)
    private String direccion;

    @Size(max = 100)
    private String ciudad;

    @Size(max = 100)
    private String departamento;

    @Size(max = 40)
    private String telefono;

    @Size(max = 40)
    private String telefonoAlternativo;

    @Email(message = "El email no es válido.")
    @Size(max = 150)
    private String email;

    @Size(max = 200)
    private String web;

    private CondicionPagoProveedor condicionPago;

    private Integer diasCredito;

    @Size(max = 500)
    private String notas;

    private Boolean activo;

    @Valid
    private List<ContactoProveedorRequestDTO> contactos;

    public String resolverRazonSocial() {
        if (razonSocial != null && !razonSocial.isBlank()) {
            return razonSocial.trim();
        }
        if (nombre != null && !nombre.isBlank()) {
            return nombre.trim();
        }
        return null;
    }

    public String resolverNumeroDocumento() {
        if (numeroDocumento != null && !numeroDocumento.isBlank()) {
            return numeroDocumento;
        }
        return documento;
    }
}
