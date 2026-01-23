package com.newproject.jhocadi.projectSolarFishBackend.model;

import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class modelRolUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol")
    private Integer idRol;
    
    @Column(name = "nombre_rol" , nullable = false, unique = true)
    private String nombreRol;
    @Column(name = "descripcion_rol")
    private String descripcionRol;
    
}
