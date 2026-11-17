package com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos;

import lombok.Data;

@Data
public class LoginRequestDTO {
    private String nombreUsuario;
    private String passwordUsuario;
}
