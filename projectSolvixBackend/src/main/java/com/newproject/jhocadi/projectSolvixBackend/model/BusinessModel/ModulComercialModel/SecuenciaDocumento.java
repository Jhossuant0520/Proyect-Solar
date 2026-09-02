package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Contador anual por tipo de documento. Evita depender del id autoincremental
 * para el identificador de negocio visible.
 */
@Entity
@Table(
    name = "secuencias_documento",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_secuencias_tipo_anio",
        columnNames = {"tipo", "anio"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecuenciaDocumento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoSecuencia tipo;

    @Column(nullable = false)
    private Integer anio;

    @Column(name = "ultimo_valor", nullable = false)
    @Builder.Default
    private Long ultimoValor = 0L;
}
