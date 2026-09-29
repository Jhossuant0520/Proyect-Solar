package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCotizacionComercial;

import jakarta.persistence.criteria.Predicate;

public final class CotizacionComercialSpecifications {

    private CotizacionComercialSpecifications() {
    }

    public static Specification<CotizacionComercial> conFiltros(
            String texto,
            EstadoCotizacionComercial estado,
            Long clienteId) {
        return Specification.allOf(
            textoContiene(texto),
            estadoEs(estado),
            clienteEs(clienteId));
    }

    /** Cada palabra debe aparecer en el número o en el nombre del cliente. */
    private static Specification<CotizacionComercial> textoContiene(String texto) {
        return (root, query, cb) -> {
            if (texto == null || texto.isBlank()) {
                return cb.conjunction();
            }
            List<String> palabras = Arrays.stream(texto.trim().toLowerCase(Locale.ROOT).split("\\s+"))
                .filter(p -> !p.isBlank())
                .toList();
            Predicate[] porPalabra = palabras.stream()
                .map(p -> {
                    String like = "%" + p + "%";
                    return cb.or(
                        cb.like(cb.lower(root.<String>get("numero")), like),
                        cb.like(cb.lower(root.<String>get("clienteNombreSnapshot")), like));
                })
                .toArray(Predicate[]::new);
            return cb.and(porPalabra);
        };
    }

    private static Specification<CotizacionComercial> estadoEs(EstadoCotizacionComercial estado) {
        return (root, query, cb) -> estado == null
            ? cb.conjunction()
            : cb.equal(root.get("estado"), estado);
    }

    private static Specification<CotizacionComercial> clienteEs(Long clienteId) {
        return (root, query, cb) -> clienteId == null
            ? cb.conjunction()
            : cb.equal(root.get("cliente").get("id"), clienteId);
    }
}
