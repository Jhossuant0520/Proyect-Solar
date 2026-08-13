package com.newproject.jhocadi.projectSolvixBackend.dtos.AccesDtos;

import lombok.Data;

@Data
public class LoginRequestDTO {
    private String nombreUsuario;
    private String passwordUsuario;
}
