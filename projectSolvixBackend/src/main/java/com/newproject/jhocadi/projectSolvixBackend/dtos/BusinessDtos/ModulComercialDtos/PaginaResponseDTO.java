package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

import lombok.Builder;
import lombok.Data;

/** Página de resultados con contrato estable (no expone la serialización interna de Spring). */
@Data
@Builder
public class PaginaResponseDTO<T> {

    private List<T> contenido;
    private int pagina;
    private int tamano;
    private long totalElementos;
    private int totalPaginas;

    public static <E, T> PaginaResponseDTO<T> desde(Page<E> page, Function<E, T> mapper) {
        return PaginaResponseDTO.<T>builder()
            .contenido(page.getContent().stream().map(mapper).toList())
            .pagina(page.getNumber())
            .tamano(page.getSize())
            .totalElementos(page.getTotalElements())
            .totalPaginas(page.getTotalPages())
            .build();
    }
}
