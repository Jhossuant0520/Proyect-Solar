package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo;

import java.math.BigDecimal;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

public final class ProductoSpecifications {

    private ProductoSpecifications() {
    }

    public static Specification<Producto> conFiltros(
            String marca,
            Long categoriaId,
            BigDecimal precioMin,
            BigDecimal precioMax,
            Integer stockMin,
            Boolean activo) {
        return conFiltros(null, marca, categoriaId, precioMin, precioMax, stockMin, activo);
    }

    public static Specification<Producto> conFiltros(
            String texto,
            String marca,
            Long categoriaId,
            BigDecimal precioMin,
            BigDecimal precioMax,
            Integer stockMin,
            Boolean activo) {

        return Specification.allOf(
            textoContiene(texto),
            marcaContiene(marca),
            categoriaEs(categoriaId),
            precioDesde(precioMin),
            precioHasta(precioMax),
            stockMayorQue(stockMin),
            activoEs(activo)
        );
    }

    /**
     * Cada palabra del texto debe aparecer en nombre, marca o código de barras
     * ("pantalla lenovo" encuentra "Pantalla LCD Lenovo X").
     */
    private static Specification<Producto> textoContiene(String texto) {
        return (root, query, cb) -> {
            if (texto == null || texto.isBlank()) {
                return cb.conjunction();
            }
            String[] palabras = texto.trim().toLowerCase().split("\\s+");
            jakarta.persistence.criteria.Predicate[] porPalabra =
                new jakarta.persistence.criteria.Predicate[palabras.length];
            for (int i = 0; i < palabras.length; i++) {
                String patron = "%" + palabras[i] + "%";
                porPalabra[i] = cb.or(
                    cb.like(cb.lower(root.<String>get("nombre")), patron),
                    cb.like(cb.lower(root.<String>get("marca")), patron),
                    cb.like(cb.lower(cb.coalesce(root.<String>get("codigoBarras"), "")), patron));
            }
            return cb.and(porPalabra);
        };
    }

    private static Specification<Producto> marcaContiene(String marca) {
        return (root, query, cb) -> {
            if (marca == null || marca.isBlank()) {
                return cb.conjunction();
            }
            return cb.like(cb.lower(root.get("marca")), "%" + marca.trim().toLowerCase() + "%");
        };
    }

    private static Specification<Producto> categoriaEs(Long categoriaId) {
        return (root, query, cb) -> {
            if (categoriaId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("categoria").get("id"), categoriaId);
        };
    }

    private static Specification<Producto> precioDesde(BigDecimal precioMin) {
        return (root, query, cb) -> {
            if (precioMin == null) {
                return cb.conjunction();
            }
            return cb.greaterThanOrEqualTo(root.get("precioVentaActual"), precioMin);
        };
    }

    private static Specification<Producto> precioHasta(BigDecimal precioMax) {
        return (root, query, cb) -> {
            if (precioMax == null) {
                return cb.conjunction();
            }
            return cb.lessThanOrEqualTo(root.get("precioVentaActual"), precioMax);
        };
    }

    private static Specification<Producto> stockMayorQue(Integer stockMin) {
        return (root, query, cb) -> {
            if (stockMin == null) {
                return cb.conjunction();
            }
            return cb.greaterThan(root.get("stockActual"), stockMin);
        };
    }

    private static Specification<Producto> activoEs(Boolean activo) {
        return (root, query, cb) -> {
            if (activo == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("activo"), activo);
        };
    }
}
