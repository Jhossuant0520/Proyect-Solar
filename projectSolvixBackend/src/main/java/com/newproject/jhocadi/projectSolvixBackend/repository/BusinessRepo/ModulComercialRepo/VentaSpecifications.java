package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Venta;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

public final class VentaSpecifications {

    private VentaSpecifications() {
    }

    public static Specification<Venta> conFiltros(
            String texto,
            Long clienteId,
            EstadoVenta estado,
            LocalDateTime desde,
            LocalDateTime hasta) {

        return Specification.allOf(
            textoContiene(texto),
            clienteEs(clienteId),
            estadoEs(estado),
            fechaDesde(desde),
            fechaHasta(hasta)
        );
    }

    /** Cada palabra debe aparecer en el número o en el nombre del cliente. */
    private static Specification<Venta> textoContiene(String texto) {
        return (root, query, cb) -> {
            if (texto == null || texto.isBlank()) {
                return cb.conjunction();
            }
            if (query != null) {
                query.distinct(true);
            }
            var cliente = root.join("cliente", JoinType.LEFT);
            List<String> palabras = Arrays.stream(texto.trim().toLowerCase(Locale.ROOT).split("\\s+"))
                .filter(p -> !p.isBlank())
                .toList();
            Predicate[] porPalabra = palabras.stream()
                .map(p -> {
                    String like = "%" + p + "%";
                    return cb.or(
                        cb.like(cb.lower(root.get("numero")), like),
                        cb.like(cb.lower(cliente.get("nombre")), like));
                })
                .toArray(Predicate[]::new);
            return cb.and(porPalabra);
        };
    }

    private static Specification<Venta> clienteEs(Long clienteId) {
        return (root, query, cb) -> clienteId == null
            ? cb.conjunction()
            : cb.equal(root.get("cliente").get("id"), clienteId);
    }

    private static Specification<Venta> estadoEs(EstadoVenta estado) {
        return (root, query, cb) -> estado == null
            ? cb.conjunction()
            : cb.equal(root.get("estado"), estado);
    }

    private static Specification<Venta> fechaDesde(LocalDateTime desde) {
        return (root, query, cb) -> desde == null
            ? cb.conjunction()
            : cb.greaterThanOrEqualTo(root.get("fecha"), desde);
    }

    private static Specification<Venta> fechaHasta(LocalDateTime hasta) {
        return (root, query, cb) -> hasta == null
            ? cb.conjunction()
            : cb.lessThanOrEqualTo(root.get("fecha"), hasta);
    }
}
