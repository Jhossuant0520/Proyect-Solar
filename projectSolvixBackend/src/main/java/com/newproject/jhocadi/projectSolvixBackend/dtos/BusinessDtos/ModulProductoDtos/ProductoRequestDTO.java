package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos;

import java.math.BigDecimal;

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
    private Long categoriaId;

    @NotNull(message = "El precio de venta es obligatorio.")
    @DecimalMin(value = "0.0", inclusive = true, message = "El precio de venta no puede ser negativo.")
    private BigDecimal precioVentaActual;

    /**
     * Costo unitario vigente. Solo se aplica al crear el producto: es el punto de partida.
     * En la actualización no puede modificarse desde este DTO; usar
     * {@code POST /api/v1/inventario/ajustes/costo}. Enviar {@code null} al crear significa
     * COSTO DESCONOCIDO, no costo cero.
     */
    @DecimalMin(value = "0.0", inclusive = true, message = "El costo no puede ser negativo.")
    private BigDecimal costoActual;

    /**
     * Solo se aplica al crear el producto y genera un movimiento CARGA_INICIAL.
     * En la actualización el stock no puede modificarse desde este DTO.
     */
    @Min(value = 0, message = "El stock inicial no puede ser negativo.")
    private Integer stockInicial;

    @Size(max = 2000)
    private String descripcion;

    @Size(max = 500)
    private String imagenUrl;

    private Boolean activo;
}
