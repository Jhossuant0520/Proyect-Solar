package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ClienteResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ConsultaCotizacionPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCotizacionComercialRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DocumentoCotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PaginaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoPdfDescargaDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoLineaCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.HtmlToPdfService;

class CotizacionComercialServiceTest extends ComercialTestSupport {

    @Autowired
    private CotizacionComercialService cotizacionService;

    @Autowired
    private DocumentoCotizacionComercialService documentoService;

    @Autowired
    private ClienteService clienteService;

    @MockitoSpyBean
    private HtmlToPdfService htmlToPdfService;

    @Test
    @DisplayName("CASO B: cliente + 2 productos + mano de obra + otro → número propio, total correcto, sin stock")
    void crearCotizacionCompleta() {
        Cliente cliente = crearCliente("Laura Gómez");
        Producto ssd = crearProducto("SSD 1 TB", new BigDecimal("200000.00"), new BigDecimal("150000.00"), 3);
        Producto ram = crearProducto("RAM 16 GB", new BigDecimal("110000.00"), new BigDecimal("80000.00"), 1);

        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(cliente.getId(),
                producto(ssd.getId(), "1", "250000"),
                producto(ram.getId(), "2", "120000"),
                manoObra("Instalación y configuración", "80000"),
                otro("Envío a domicilio", "15000")),
            USUARIO_TEST);

        assertThat(cot.getNumero()).isEqualTo("CC-" + LocalDateTime.now().getYear() + "-000001");
        assertThat(cot.getEstado()).isEqualTo(EstadoCotizacionComercial.BORRADOR);
        assertThat(cot.getClienteNombre()).isEqualTo("Laura Gómez");
        assertThat(cot.getDetalles()).hasSize(4);
        assertThat(cot.getSubtotalProductos()).isEqualByComparingTo("490000");
        assertThat(cot.getSubtotalManoObra()).isEqualByComparingTo("80000");
        assertThat(cot.getSubtotalOtros()).isEqualByComparingTo("15000");
        assertThat(cot.getTotal()).isEqualByComparingTo("585000");

        assertThat(stockDe(ssd.getId())).isEqualTo(3);
        assertThat(stockDe(ram.getId())).isEqualTo(1);
        assertThat(movimientoRepository.count()).isZero();
    }

    @Test
    @DisplayName("El precio de la línea queda congelado aunque cambie el catálogo")
    void precioCongelado() {
        Producto ssd = crearProducto("SSD 1 TB", new BigDecimal("200000.00"), null, 5);
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(null, producto(ssd.getId(), "1", "250000")), USUARIO_TEST);

        ssd.setPrecioVentaActual(new BigDecimal("310000.00"));
        productoRepository.save(ssd);

        CotizacionComercialResponseDTO recargada = cotizacionService.obtener(cot.getId());
        assertThat(recargada.getDetalles().get(0).getPrecioUnitario()).isEqualByComparingTo("250000");
        assertThat(recargada.getDetalles().get(0).getProductoNombreSnapshot()).isEqualTo("SSD 1 TB");
        assertThat(recargada.getTotal()).isEqualByComparingTo("250000");
    }

    @Test
    @DisplayName("Sin precio explícito toma el precio de venta vigente como sugerencia")
    void precioSugeridoDelCatalogo() {
        Producto ssd = crearProducto("SSD", new BigDecimal("199000.00"), null, 1);
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(null, producto(ssd.getId(), "2", null)), USUARIO_TEST);
        assertThat(cot.getTotal()).isEqualByComparingTo("398000");
        assertThat(cot.isClienteConsumidorFinal()).isTrue();
    }

    @Test
    @DisplayName("CASO C: editar con PUT conserva id y número, cambia contenido y no crea otra cotización")
    void editarMismaCotizacion() {
        Cliente cliente = crearCliente("Cliente C");
        Producto ssd = crearProducto("SSD", new BigDecimal("200000.00"), null, 2);
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(cliente.getId(), producto(ssd.getId(), "1", "250000")), USUARIO_TEST);

        CotizacionComercialResponseDTO editada = cotizacionService.actualizar(cot.getId(),
            request(cliente.getId(),
                producto(ssd.getId(), "2", "240000"),
                manoObra("Instalación", "50000")),
            USUARIO_TEST);

        assertThat(editada.getId()).isEqualTo(cot.getId());
        assertThat(editada.getNumero()).isEqualTo(cot.getNumero());
        assertThat(editada.getDetalles()).hasSize(2);
        assertThat(editada.getTotal()).isEqualByComparingTo("530000");
        assertThat(cotizacionComercialRepository.count()).isEqualTo(1);
        assertThat(stockDe(ssd.getId())).isEqualTo(2);
    }

    @Test
    @DisplayName("Presentar genera PDF; editar la presentada vuelve a borrador y re-presentar crea versión 2")
    void presentarEditarYRepresentar() throws Exception {
        Producto ssd = crearProducto("SSD", new BigDecimal("200000.00"), null, 1);
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(null, producto(ssd.getId(), "1", "250000")), USUARIO_TEST);

        assertThatThrownBy(() -> documentoService.generar(cot.getId(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class);

        CotizacionComercialResponseDTO presentada = cotizacionService.presentar(cot.getId(), USUARIO_TEST);
        assertThat(presentada.getEstado()).isEqualTo(EstadoCotizacionComercial.PENDIENTE_APROBACION);
        assertThat(presentada.isDocumentoGenerado()).isTrue();
        assertThat(presentada.getDocumentoVigente()).isNotNull();
        assertThat(presentada.getDocumentoVigente().getVersion()).isEqualTo(1);

        List<DocumentoCotizacionComercialResponseDTO> docs = documentoService.listar(cot.getId());
        assertThat(docs).hasSize(1);
        assertThat(docs.get(0).getVersion()).isEqualTo(1);
        assertThat(docs.get(0).getNombreArchivo()).isEqualTo(cot.getNumero() + ".pdf");
        DocumentoPdfDescargaDTO descarga = documentoService.descargar(cot.getId(), docs.get(0).getId());
        byte[] pdf = descarga.getResource().getInputStream().readAllBytes();
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
        try (org.apache.pdfbox.pdmodel.PDDocument pd = org.apache.pdfbox.pdmodel.PDDocument.load(pdf)) {
            String texto = new org.apache.pdfbox.text.PDFTextStripper().getText(pd);
            assertThat(texto).doesNotContain("Escanea");
            assertThat(texto).doesNotContain("QR");
            assertThat(texto).doesNotContain("Trazabilidad");
            // D.8: sin representación visual de fecha de presentación
            assertThat(texto).doesNotContainIgnoringCase("Presentada");
            assertThat(texto).doesNotContainIgnoringCase("Fecha presentada");
            assertThat(texto).containsIgnoringCase("Fecha");
            assertThat(texto).contains("$250.000");
            assertThat(texto).doesNotContain(",00");
        }
        // fechaPresentacion permanece en el modelo/DTO tras presentar
        assertThat(presentada.getFechaPresentacion()).isNotNull();
        assertThat(cotizacionService.obtener(cot.getId()).getFechaPresentacion()).isNotNull();
        assertThat(cotizacionService.obtener(cot.getId()).getDocumentoVigente().getVersion()).isEqualTo(1);

        CotizacionComercialResponseDTO editada = cotizacionService.actualizar(cot.getId(),
            request(null, producto(ssd.getId(), "1", "230000")), USUARIO_TEST);
        assertThat(editada.getEstado()).isEqualTo(EstadoCotizacionComercial.BORRADOR);
        assertThat(editada.getFechaPresentacion()).isNull();
        assertThat(documentoService.listar(cot.getId())).hasSize(1);

        CotizacionComercialResponseDTO rePresentada = cotizacionService.presentar(cot.getId(), USUARIO_TEST);
        assertThat(rePresentada.isDocumentoGenerado()).isTrue();
        assertThat(rePresentada.getDocumentoVigente().getVersion()).isEqualTo(2);
        List<DocumentoCotizacionComercialResponseDTO> versiones = documentoService.listar(cot.getId());
        assertThat(versiones).extracting(DocumentoCotizacionComercialResponseDTO::getVersion)
            .containsExactly(2, 1);
        assertThat(cotizacionComercialRepository.count()).isEqualTo(1);
        assertThat(stockDe(ssd.getId())).isEqualTo(1);
        assertThat(movimientoRepository.count()).isZero();
    }

    @Test
    @DisplayName("Presentar con PDF fallido: cotización queda PENDIENTE; recovery genera v1; re-Presentar rechazado")
    void presentarConFalloPdfYRecuperacion() {
        Producto ssd = crearProducto("SSD Fail", new BigDecimal("200000.00"), null, 1);
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(null, producto(ssd.getId(), "1", "250000")), USUARIO_TEST);

        doThrow(new RuntimeException("fallo PDF controlado"))
            .when(htmlToPdfService).renderDesdeClasspath(anyString(), anyMap());

        CotizacionComercialResponseDTO presentada;
        try {
            presentada = cotizacionService.presentar(cot.getId(), USUARIO_TEST);
        } finally {
            reset(htmlToPdfService);
        }

        assertThat(presentada.getEstado()).isEqualTo(EstadoCotizacionComercial.PENDIENTE_APROBACION);
        assertThat(presentada.getFechaPresentacion()).isNotNull();
        assertThat(presentada.isDocumentoGenerado()).isFalse();
        assertThat(presentada.getDocumentoVigente()).isNull();
        assertThat(presentada.isPuedePresentar()).isFalse();
        assertThat(documentoService.listar(cot.getId())).isEmpty();

        assertThatThrownBy(() -> cotizacionService.presentar(cot.getId(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("BORRADOR");

        DocumentoCotizacionComercialResponseDTO recuperado =
            documentoService.generar(cot.getId(), USUARIO_TEST);
        assertThat(recuperado.getVersion()).isEqualTo(1);
        assertThat(documentoService.listar(cot.getId())).hasSize(1);
        assertThat(cotizacionService.obtener(cot.getId()).isDocumentoGenerado()).isTrue();
    }

    @Test
    @DisplayName("CASO D: la cotización aprobada no se puede editar")
    void aprobadaNoEditable() {
        Producto ssd = crearProducto("SSD", new BigDecimal("200000.00"), null, 1);
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(null, producto(ssd.getId(), "1", "250000")), USUARIO_TEST);
        cotizacionService.presentar(cot.getId(), USUARIO_TEST);
        CotizacionComercialResponseDTO aprobada = cotizacionService.aprobar(cot.getId(), USUARIO_TEST);

        assertThat(aprobada.getEstado()).isEqualTo(EstadoCotizacionComercial.APROBADA);
        assertThat(aprobada.isPuedeEditar()).isFalse();
        assertThat(aprobada.isPuedeAnular()).isFalse();
        assertThatThrownBy(() -> cotizacionService.actualizar(cot.getId(),
                request(null, producto(ssd.getId(), "1", "1")), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("aprobada");
        assertThat(cotizacionService.obtener(cot.getId()).getTotal()).isEqualByComparingTo("250000");
        assertThat(stockDe(ssd.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("Rechazar guarda el motivo; solo se aprueba/rechaza lo presentado")
    void rechazarYTransiciones() {
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(null, manoObra("Diagnóstico", "40000")), USUARIO_TEST);

        assertThatThrownBy(() -> cotizacionService.aprobar(cot.getId(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class);

        cotizacionService.presentar(cot.getId(), USUARIO_TEST);
        CotizacionComercialResponseDTO rechazada =
            cotizacionService.rechazar(cot.getId(), "Precio alto", USUARIO_TEST);
        assertThat(rechazada.getEstado()).isEqualTo(EstadoCotizacionComercial.RECHAZADA);
        assertThat(rechazada.getMotivoRechazo()).isEqualTo("Precio alto");
        assertThat(rechazada.isPuedeEditar()).isFalse();

        CotizacionComercialResponseDTO anulada = cotizacionService.anular(cot.getId(), USUARIO_TEST);
        assertThat(anulada.getEstado()).isEqualTo(EstadoCotizacionComercial.ANULADA);
    }

    @Test
    @DisplayName("Validaciones de línea: producto obligatorio, descripción, cantidad y producto inactivo")
    void validaciones() {
        Producto inactivo = crearProducto("Viejo", new BigDecimal("1000.00"), null, 1);
        inactivo.setActivo(false);
        productoRepository.save(inactivo);

        assertThatThrownBy(() -> cotizacionService.crear(
                request(null, linea(TipoLineaCotizacionComercial.PRODUCTO, null, null, "1", "100")),
                USUARIO_TEST))
            .isInstanceOf(BusinessException.class).hasMessageContaining("producto del catálogo");
        assertThatThrownBy(() -> cotizacionService.crear(request(null, manoObra(" ", "100")), USUARIO_TEST))
            .isInstanceOf(BusinessException.class).hasMessageContaining("descripción");
        assertThatThrownBy(() -> cotizacionService.crear(
                request(null, linea(TipoLineaCotizacionComercial.OTRO, "x", null, "0", "100")), USUARIO_TEST))
            .isInstanceOf(BusinessException.class).hasMessageContaining("cantidad");
        assertThatThrownBy(() -> cotizacionService.crear(
                request(null, producto(inactivo.getId(), "1", "100")), USUARIO_TEST))
            .isInstanceOf(BusinessException.class).hasMessageContaining("inactivo");
        assertThatThrownBy(() -> cotizacionService.crear(request(null), USUARIO_TEST))
            .isInstanceOf(BusinessException.class).hasMessageContaining("al menos una línea");
        assertThat(cotizacionComercialRepository.count()).isZero();
    }

    @Test
    @DisplayName("Máximo una línea MANO_OBRA: una es válida; dos se rechazan en crear y en actualizar")
    void maximoUnaManoObra() {
        Producto ssd = crearProducto("SSD", new BigDecimal("200000.00"), null, 1);

        CotizacionComercialResponseDTO conUna = cotizacionService.crear(
            request(null,
                producto(ssd.getId(), "1", "250000"),
                manoObra("Instalación", "80000"),
                otro("Envío", "15000")),
            USUARIO_TEST);
        assertThat(conUna.getDetalles()).hasSize(3);
        assertThat(conUna.getSubtotalManoObra()).isEqualByComparingTo("80000");

        assertThatThrownBy(() -> cotizacionService.crear(
                request(null,
                    manoObra("Diagnóstico", "40000"),
                    manoObra("Instalación", "80000")),
                USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("una línea de mano de obra");
        assertThat(cotizacionComercialRepository.count()).isEqualTo(1);

        assertThatThrownBy(() -> cotizacionService.actualizar(conUna.getId(),
                request(null,
                    manoObra("Diagnóstico", "40000"),
                    manoObra("Instalación extra", "50000")),
                USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("una línea de mano de obra");

        CotizacionComercialResponseDTO intacta = cotizacionService.obtener(conUna.getId());
        assertThat(intacta.getDetalles()).hasSize(3);
        assertThat(intacta.getSubtotalManoObra()).isEqualByComparingTo("80000");
    }

    @Test
    @DisplayName("Un producto desactivado después de cotizarlo se conserva al editar la misma cotización")
    void productoDesactivadoSeConservaAlEditar() {
        Producto ssd = crearProducto("SSD", new BigDecimal("200000.00"), null, 1);
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(null, producto(ssd.getId(), "1", "250000")), USUARIO_TEST);
        ssd.setActivo(false);
        productoRepository.save(ssd);

        CotizacionComercialResponseDTO editada = cotizacionService.actualizar(cot.getId(),
            request(null, producto(ssd.getId(), "1", "250000"), manoObra("Instalación", "10000")),
            USUARIO_TEST);
        assertThat(editada.getDetalles()).hasSize(2);
        assertThat(editada.getDetalles().get(0).getProductoActivo()).isFalse();
    }

    @Test
    @DisplayName("Listado paginado filtra por número, cliente y estado")
    void listadoPaginado() {
        Cliente ana = crearCliente("Ana Pérez");
        Cliente beto = crearCliente("Beto Ruiz");
        for (int i = 0; i < 3; i++) {
            cotizacionService.crear(request(ana.getId(), manoObra("Servicio " + i, "1000")), USUARIO_TEST);
        }
        CotizacionComercialResponseDTO deBeto =
            cotizacionService.crear(request(beto.getId(), manoObra("Otro", "1000")), USUARIO_TEST);
        cotizacionService.presentar(deBeto.getId(), USUARIO_TEST);

        PaginaResponseDTO<CotizacionComercialResumenDTO> pagina =
            cotizacionService.listar(null, null, null, 0, 2);
        assertThat(pagina.getContenido()).hasSize(2);
        assertThat(pagina.getTotalElementos()).isEqualTo(4);
        assertThat(pagina.getTotalPaginas()).isEqualTo(2);

        assertThat(cotizacionService.listar("ana", null, null, 0, 20).getTotalElementos()).isEqualTo(3);
        assertThat(cotizacionService.listar(deBeto.getNumero(), null, null, 0, 20).getContenido())
            .extracting(CotizacionComercialResumenDTO::getId).containsExactly(deBeto.getId());
        assertThat(cotizacionService.listar(null, EstadoCotizacionComercial.PENDIENTE_APROBACION, null, 0, 20)
            .getTotalElementos()).isEqualTo(1);
    }

    @Test
    @DisplayName("QR: la consulta pública usa un token opaco y no expone borradores")
    void consultaPublica() {
        CotizacionComercialResponseDTO cot = cotizacionService.crear(
            request(crearCliente("Privado").getId(), manoObra("Mantenimiento", "90000")), USUARIO_TEST);
        CotizacionComercial entidad = cotizacionComercialRepository.findById(cot.getId()).orElseThrow();
        String token = entidad.getTokenConsulta();
        assertThat(token).hasSize(32).matches("[0-9a-f]{32}")
            .isNotEqualTo(String.valueOf(cot.getId())).doesNotContain(cot.getNumero());

        assertThatThrownBy(() -> documentoService.consultaPublica(token))
            .isInstanceOf(ResponseStatusException.class);

        cotizacionService.presentar(cot.getId(), USUARIO_TEST);
        ConsultaCotizacionPublicaDTO publica = documentoService.consultaPublica(token);
        assertThat(publica.getNumero()).isEqualTo(cot.getNumero());
        assertThat(publica.getTotal()).isEqualByComparingTo("90000");
        assertThat(publica.getEstadoPublico()).isEqualTo("Pendiente de tu aprobación");
        assertThat(publica.getLineas()).hasSize(1);
    }

    @Test
    @DisplayName("Búsqueda de clientes acotada por texto y límite")
    void buscarClientes() {
        crearCliente("Carlos Díaz");
        crearCliente("Carla Mora");
        crearCliente("Pedro Paz");

        List<ClienteResponseDTO> encontrados = clienteService.buscar("carl", 10, true);
        assertThat(encontrados).extracting(ClienteResponseDTO::getNombre)
            .containsExactly("Carla Mora", "Carlos Díaz");
        assertThat(clienteService.buscar("", 2, true)).hasSize(2);
        // D.3: preview sin q textual respeta el límite pedido (máx. 5 en FE)
        assertThat(clienteService.buscar("", 5, true)).hasSizeLessThanOrEqualTo(5);
        assertThat(clienteService.buscar(null, 5, true)).hasSizeLessThanOrEqualTo(5);
    }

    private CotizacionComercialRequestDTO request(Long clienteId, DetalleCotizacionComercialRequestDTO... lineas) {
        CotizacionComercialRequestDTO request = new CotizacionComercialRequestDTO();
        request.setClienteId(clienteId);
        request.setDetalles(new ArrayList<>(List.of(lineas)));
        return request;
    }

    private DetalleCotizacionComercialRequestDTO producto(Long productoId, String cantidad, String precio) {
        return linea(TipoLineaCotizacionComercial.PRODUCTO, null, productoId, cantidad, precio);
    }

    private DetalleCotizacionComercialRequestDTO manoObra(String descripcion, String precio) {
        return linea(TipoLineaCotizacionComercial.MANO_OBRA, descripcion, null, "1", precio);
    }

    private DetalleCotizacionComercialRequestDTO otro(String descripcion, String precio) {
        return linea(TipoLineaCotizacionComercial.OTRO, descripcion, null, "1", precio);
    }

    private DetalleCotizacionComercialRequestDTO linea(
            TipoLineaCotizacionComercial tipo, String descripcion, Long productoId, String cantidad, String precio) {
        DetalleCotizacionComercialRequestDTO d = new DetalleCotizacionComercialRequestDTO();
        d.setTipo(tipo);
        d.setDescripcion(descripcion);
        d.setProductoId(productoId);
        d.setCantidad(new BigDecimal(cantidad));
        d.setPrecioUnitario(precio != null ? new BigDecimal(precio) : null);
        return d;
    }
}
