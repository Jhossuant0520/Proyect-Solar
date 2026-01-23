package com.newproject.jhocadi.projectSolarFishBackend.dtos;

import lombok.Data;

@Data
public class LoginRequestDTO {
    private String nombreUsuario;
    private String passwordUsuario;
}
