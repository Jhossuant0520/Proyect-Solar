package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ContactoProveedorRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ProveedorRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ProveedorResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoContactoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

class ProveedorServiceTest extends ComercialTestSupport {

    @Autowired
    private ProveedorService proveedorService;

    @Autowired
    private CompraService compraService;

    @Test
    @DisplayName("Crea proveedor con NIT normalizado, razón social y contacto")
    void crearProveedorConContacto() {
        ProveedorRequestDTO request = requestBase("Distribuidora Alpha S.A.S", "900.123.456-7");
        ContactoProveedorRequestDTO contacto = new ContactoProveedorRequestDTO();
        contacto.setNombre("Ana Comercial");
        contacto.setTipoContacto(TipoContactoProveedor.COMERCIAL);
        contacto.setPrincipal(true);
        request.setContactos(List.of(contacto));

        ProveedorResponseDTO creado = proveedorService.crear(request);

        assertThat(creado.getRazonSocial()).isEqualTo("Distribuidora Alpha S.A.S");
        assertThat(creado.getNombre()).isEqualTo("Distribuidora Alpha S.A.S");
        assertThat(creado.getTipoDocumento()).isEqualTo(TipoDocumento.NIT);
        assertThat(creado.getNumeroDocumento()).isEqualTo("9001234567");
        assertThat(creado.getDocumento()).isEqualTo("9001234567");
        assertThat(creado.getContactos()).hasSize(1);
        assertThat(creado.getContactos().get(0).isPrincipal()).isTrue();
    }

    @Test
    @DisplayName("Rechaza NIT duplicado aunque el formato visual sea distinto")
    void nitDuplicadoNormalizado() {
        proveedorService.crear(requestBase("Proveedor Uno", "901.111.222-3"));

        assertThatThrownBy(() -> proveedorService.crear(requestBase("Proveedor Dos", "9011112223")))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("NIT");
    }

    @Test
    @DisplayName("Rechaza razón social o NIT vacíos")
    void camposObligatorios() {
        ProveedorRequestDTO sinRazon = new ProveedorRequestDTO();
        sinRazon.setNumeroDocumento("900111222");
        assertThatThrownBy(() -> proveedorService.crear(sinRazon))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("razón social");

        ProveedorRequestDTO sinNit = new ProveedorRequestDTO();
        sinNit.setRazonSocial("Sin NIT");
        assertThatThrownBy(() -> proveedorService.crear(sinNit))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("NIT");
    }

    @Test
    @DisplayName("Solo un contacto principal activo")
    void principalUnico() {
        ProveedorRequestDTO request = requestBase("Proveedor Contactos", "902.000.001-1");
        ContactoProveedorRequestDTO a = new ContactoProveedorRequestDTO();
        a.setNombre("Uno");
        a.setPrincipal(true);
        ContactoProveedorRequestDTO b = new ContactoProveedorRequestDTO();
        b.setNombre("Dos");
        b.setPrincipal(true);
        request.setContactos(List.of(a, b));

        assertThatThrownBy(() -> proveedorService.crear(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("principal");
    }

    @Test
    @DisplayName("Crédito exige días > 0")
    void creditoRequiereDias() {
        ProveedorRequestDTO request = requestBase("Proveedor Crédito", "903.000.001-1");
        request.setCondicionPago(CondicionPagoProveedor.CREDITO);
        request.setDiasCredito(0);

        assertThatThrownBy(() -> proveedorService.crear(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("días");
    }

    @Test
    @DisplayName("Buscar por razón social o NIT")
    void buscarProveedor() {
        proveedorService.crear(requestBase("TecnoParts Colombia", "904.555.666-1"));

        List<ProveedorResponseDTO> porNombre = proveedorService.buscar("tecnoparts", 10, true);
        assertThat(porNombre).extracting(ProveedorResponseDTO::getRazonSocial)
            .contains("TecnoParts Colombia");

        List<ProveedorResponseDTO> porNit = proveedorService.buscar("9045556661", 10, true);
        assertThat(porNit).isNotEmpty();
    }

    @Test
    @DisplayName("Desactivar no elimina el proveedor ni sus contactos")
    void desactivarConservaHistorial() {
        ProveedorResponseDTO creado = proveedorService.crear(requestBase("Para Desactivar", "905.111.222-0"));
        ContactoProveedorRequestDTO contacto = new ContactoProveedorRequestDTO();
        contacto.setNombre("Contacto");
        contacto.setPrincipal(true);
        ProveedorRequestDTO update = requestBase("Para Desactivar", "905.111.222-0");
        update.setContactos(List.of(contacto));
        proveedorService.actualizar(creado.getId(), update);

        ProveedorResponseDTO desactivado = proveedorService.desactivar(creado.getId());
        assertThat(desactivado.isActivo()).isFalse();

        ProveedorResponseDTO consultado = proveedorService.obtenerPorId(creado.getId());
        assertThat(consultado.getContactos()).isNotEmpty();
        assertThat(consultado.isActivo()).isFalse();
    }

    @Test
    @DisplayName("Nueva compra bloquea proveedor inactivo; completar compra previa sigue permitido")
    void compraConProveedorInactivo() {
        Producto producto = crearProducto("Prod Prov", new BigDecimal("100.00"), null, 0);
        ProveedorResponseDTO proveedor = proveedorService.crear(requestBase("Prov Compra", "906.777.888-9"));

        CompraResponseDTO compra = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 2, new BigDecimal("50.00")), USUARIO_TEST);
        assertThat(compra.getProveedorNombre()).isEqualTo("Prov Compra");
        assertThat(compra.getProveedorDocumento()).isEqualTo("9067778889");

        proveedorService.desactivar(proveedor.getId());

        assertThatThrownBy(() -> compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 1, new BigDecimal("50.00")), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("inactivo");

        CompraResponseDTO completada = compraService.completar(compra.getId(), USUARIO_TEST);
        assertThat(completada.getEstado()).isEqualTo(EstadoCompra.COMPLETADA);
        assertThat(completada.getProveedorNombre()).isEqualTo("Prov Compra");
    }

    @Test
    @DisplayName("Cambiar razón social no altera el snapshot de una compra ya creada")
    void snapshotNoCambiaConRenombre() {
        Producto producto = crearProducto("Prod Snap", new BigDecimal("100.00"), null, 0);
        ProveedorResponseDTO proveedor = proveedorService.crear(requestBase("Nombre Original", "907.111.000-1"));

        CompraResponseDTO compra = compraService.crear(
            requestCompra(proveedor.getId(), producto.getId(), 1, new BigDecimal("10.00")), USUARIO_TEST);

        ProveedorRequestDTO rename = requestBase("Nombre Nuevo", "907.111.000-1");
        proveedorService.actualizar(proveedor.getId(), rename);

        CompraResponseDTO historica = compraService.obtenerPorId(compra.getId());
        assertThat(historica.getProveedorNombre()).isEqualTo("Nombre Original");

        Proveedor vivo = proveedorRepository.findById(proveedor.getId()).orElseThrow();
        assertThat(vivo.getNombre()).isEqualTo("Nombre Nuevo");
    }

    private ProveedorRequestDTO requestBase(String razonSocial, String nit) {
        ProveedorRequestDTO request = new ProveedorRequestDTO();
        request.setRazonSocial(razonSocial);
        request.setNumeroDocumento(nit);
        request.setActivo(true);
        return request;
    }

    private CompraRequestDTO requestCompra(Long proveedorId, Long productoId, int cantidad, BigDecimal costo) {
        DetalleCompraRequestDTO detalle = new DetalleCompraRequestDTO();
        detalle.setProductoId(productoId);
        detalle.setCantidad(cantidad);
        detalle.setCostoUnitario(costo);
        CompraRequestDTO request = new CompraRequestDTO();
        request.setProveedorId(proveedorId);
        request.setDetalles(List.of(detalle));
        return request;
    }
}
