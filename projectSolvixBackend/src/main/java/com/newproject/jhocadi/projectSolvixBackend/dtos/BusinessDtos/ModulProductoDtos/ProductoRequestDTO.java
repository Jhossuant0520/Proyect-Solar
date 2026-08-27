package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProductoRequestDTO {

    @NotBlank(message = "El nombre es obligatorio.")
    @Size(max = 150)
    private String nombre;

    @NotBlank(message = "La marca es obligatoria.")
    @Size(max = 100)
    private String marca;

    @NotNull(message = "La categoría es obligatoria.")
    private CategoriaProducto categoria;

    @NotNull(message = "El precio es obligatorio.")
    @DecimalMin(value = "0.0", inclusive = true, message = "El precio no puede ser negativo.")
    private BigDecimal precio;

    @NotNull(message = "La cantidad en stock es obligatoria.")
    @Min(value = 0, message = "El stock no puede ser negativo.")
    private Integer cantidadStock;

    @Size(max = 2000)
    private String descripcion;

    @Size(max = 500)
    private String imagenUrl;

    private Boolean activo;
}
