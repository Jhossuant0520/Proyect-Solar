package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Línea de cotización comercial. El precio queda congelado aunque cambie el catálogo. */
@Entity
@Table(name = "detalles_cotizacion_comercial")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleCotizacionComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cotizacion_id", nullable = false)
    private CotizacionComercial cotizacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoLineaCotizacionComercial tipo;

    @Column(nullable = false, length = 255)
    private String descripcion;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 14, scale = 2)
    private BigDecimal precioUnitario;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id")
    private Producto producto;

    @Column(name = "producto_nombre_snapshot", length = 150)
    private String productoNombreSnapshot;
}
