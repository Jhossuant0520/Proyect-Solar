package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoCliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.AjusteCostoProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ClienteRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CompraRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.DevolucionCompraRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.DevolucionVentaRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.MovimientoInventarioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ProveedorRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.SecuenciaDocumentoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.VentaRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.CategoriaProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.EquipoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.HistorialEstadoOrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepuestoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;

/**
 * Base de pruebas del módulo comercial. No usa @Transactional para que las reglas
 * transaccionales reales (commit y rollback de los servicios) queden verificadas.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class ComercialTestSupport {

    protected static final String USUARIO_TEST = "admin-test";

    @Autowired
    protected ProductoRepository productoRepository;

    @Autowired
    protected CategoriaProductoRepository categoriaRepository;

    @Autowired
    protected ClienteRepository clienteRepository;

    @Autowired
    protected ProveedorRepository proveedorRepository;

    @Autowired
    protected VentaRepository ventaRepository;

    @Autowired
    protected DevolucionVentaRepository devolucionVentaRepository;

    @Autowired
    protected CompraRepository compraRepository;

    @Autowired
    protected DevolucionCompraRepository devolucionCompraRepository;

    @Autowired
    protected MovimientoInventarioRepository movimientoRepository;

    @Autowired
    protected AjusteCostoProductoRepository ajusteCostoRepository;

    @Autowired
    protected SecuenciaDocumentoRepository secuenciaRepository;

    @Autowired
    protected OrdenServicioRepository ordenServicioRepository;

    @Autowired
    protected EquipoRepository equipoRepository;

    @Autowired
    protected OrdenServicioRepuestoRepository ordenServicioRepuestoRepository;

    @Autowired
    protected HistorialEstadoOrdenServicioRepository historialEstadoOrdenServicioRepository;

    @BeforeEach
    protected void limpiarDatos() {
        movimientoRepository.deleteAll();
        // Las devoluciones referencian el detalle del documento original:
        // deben borrarse antes que las ventas y las compras.
        devolucionVentaRepository.deleteAll();
        ventaRepository.deleteAll();
        devolucionCompraRepository.deleteAll();
        compraRepository.deleteAll();
        ajusteCostoRepository.deleteAll();
        ordenServicioRepuestoRepository.deleteAll();
        historialEstadoOrdenServicioRepository.deleteAll();
        ordenServicioRepository.deleteAll();
        equipoRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        clienteRepository.deleteAll();
        proveedorRepository.deleteAll();
        secuenciaRepository.deleteAll();
    }

    protected CategoriaProducto crearCategoria() {
        return categoriaRepository.save(
            CategoriaProducto.builder()
                .codigo("GENERAL")
                .nombre("General")
                .activo(true)
                .build());
    }

    /** Producto con costo conocido y stock ya cargado directamente en el repositorio. */
    protected Producto crearProducto(String nombre, BigDecimal precio, BigDecimal costo, int stock) {
        return productoRepository.save(
            Producto.builder()
                .nombre(nombre)
                .marca("Marca")
                .categoria(crearCategoriaSiFalta())
                .precioVentaActual(precio)
                .costoActual(costo)
                .stockActual(stock)
                .activo(true)
                .build());
    }

    protected Cliente crearCliente(String nombre) {
        return clienteRepository.save(
            Cliente.builder()
                .nombre(nombre)
                .tipoCliente(TipoCliente.PERSONA)
                .activo(true)
                .build());
    }

    protected Proveedor crearProveedor(String nombre) {
        return proveedorRepository.save(
            Proveedor.builder()
                .nombre(nombre)
                .activo(true)
                .build());
    }

    protected int stockDe(Long productoId) {
        return productoRepository.findById(productoId).orElseThrow().getStockActual();
    }

    protected BigDecimal costoDe(Long productoId) {
        return productoRepository.findById(productoId).orElseThrow().getCostoActual();
    }

    private CategoriaProducto crearCategoriaSiFalta() {
        return categoriaRepository.findByCodigoIgnoreCase("GENERAL").orElseGet(this::crearCategoria);
    }
}
