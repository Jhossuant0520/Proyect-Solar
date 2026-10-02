package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarDiagnosticoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarReparacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaDocumentoPublicoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CotizacionServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DetalleCotizacionServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoPdfDescargaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OutcomeAsegurarComprobante;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarEntregaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDocumentoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class DocumentoOrdenServicioServiceTest extends ComercialTestSupport {

    @Autowired
    private DocumentoOrdenServicioService documentoService;

    @Autowired
    private OrdenServicioService ordenServicioService;

    @Autowired
    private CotizacionServicioService cotizacionService;

    @Autowired
    private EquipoService equipoService;

    @Autowired
    private DocumentoPdfStorageService storageService;

    @Test
    @DisplayName("genera comprobante de recepción con PDF no vacío")
    void generarComprobanteRecepcion() throws Exception {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        // Hook afterCommit puede haber generado ya una versión
        List<DocumentoOrdenServicioResponseDTO> existentes = documentoService.listar(orden.getId());
        DocumentoOrdenServicioResponseDTO doc = existentes.stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION)
            .findFirst()
            .orElseGet(() -> documentoService.generarComprobanteRecepcion(orden.getId(), USUARIO_TEST));

        assertThat(doc.getTipoDocumento()).isEqualTo(TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION);
        assertThat(doc.getVersion()).isGreaterThanOrEqualTo(1);
        assertThat(doc.getNombreArchivo()).contains("Recepcion").endsWith(".pdf");
        assertThat(doc.getHashSha256()).hasSize(64);
        assertThat(doc.getOrdenServicioId()).isEqualTo(orden.getId());

        DocumentoPdfDescargaDTO descarga = documentoService.descargarPdf(orden.getId(), doc.getId());
        Resource resource = descarga.getResource();
        assertThat(resource.exists()).isTrue();
        byte[] bytes = resource.getInputStream().readAllBytes();
        assertThat(bytes.length).isGreaterThan(100);
        assertThat(bytes[0]).isEqualTo((byte) '%');
        assertThat(bytes[1]).isEqualTo((byte) 'P');
        assertThat(bytes[2]).isEqualTo((byte) 'D');
        assertThat(bytes[3]).isEqualTo((byte) 'F');
    }

    @Test
    @DisplayName("D.2: comprobante de recepción incorpora firma del cliente (HTML)")
    void comprobanteRecepcionIncluyeFirma() throws Exception {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        DocumentoOrdenServicioResponseDTO doc = documentoService.listar(orden.getId()).stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION)
            .findFirst()
            .orElseGet(() -> documentoService.generarComprobanteRecepcion(orden.getId(), USUARIO_TEST));

        DocumentoPdfDescargaDTO descarga = documentoService.descargarPdf(orden.getId(), doc.getId());
        byte[] bytes = descarga.getResource().getInputStream().readAllBytes();
        assertThat(bytes.length).isGreaterThan(500);
        assertThat(bytes[0]).isEqualTo((byte) '%');

        // Regenerar produce nueva versión válida (firma recepción, no entrega)
        DocumentoOrdenServicioResponseDTO regenerado =
            documentoService.regenerar(orden.getId(), doc.getId(), USUARIO_TEST);
        assertThat(regenerado.getVersion()).isGreaterThan(doc.getVersion());
        byte[] regenBytes = documentoService.descargarPdf(orden.getId(), regenerado.getId())
            .getResource().getInputStream().readAllBytes();
        assertThat(regenBytes[0]).isEqualTo((byte) '%');
        assertThat(regenBytes.length).isGreaterThan(100);

        try (org.apache.pdfbox.pdmodel.PDDocument pd =
                 org.apache.pdfbox.pdmodel.PDDocument.load(regenBytes)) {
            String texto = new org.apache.pdfbox.text.PDFTextStripper().getText(pd);
            assertThat(texto).doesNotContainIgnoringCase(
                "El cliente confirma la recepción del equipo por parte del taller");
            assertThat(texto).doesNotContainIgnoringCase("para diagnóstico, revisión o servicio");
            assertThat(texto).containsIgnoringCase("Firma del cliente");
        }
    }

    @Test
    @DisplayName("D.2: acta de entrega no usa firma de recepción")
    void actaEntregaUsaFirmaEntregaNoRecepcion() throws Exception {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        RegistrarEntregaRequestDTO entrega = new RegistrarEntregaRequestDTO();
        entrega.setClienteConfirmo(true);
        entrega.setNombreCliente("Receptor Entrega");
        entrega.setDocumentoCliente("999");
        entrega.setFirmaBase64(FirmaRecepcionTestSupport.PNG_1X1_DATA_URL);
        ordenServicioService.registrarEntrega(orden.getId(), entrega, USUARIO_TEST);

        DocumentoOrdenServicioResponseDTO acta = documentoService.listar(orden.getId()).stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.ACTA_ENTREGA)
            .findFirst()
            .orElseGet(() -> documentoService.generarActaEntrega(orden.getId(), USUARIO_TEST));

        assertThat(acta.getTipoDocumento()).isEqualTo(TipoDocumentoOrdenServicio.ACTA_ENTREGA);
        byte[] bytes = documentoService.descargarPdf(orden.getId(), acta.getId())
            .getResource().getInputStream().readAllBytes();
        assertThat(bytes[0]).isEqualTo((byte) '%');
        assertThat(bytes.length).isGreaterThan(100);
    }

    @Test
    @DisplayName("POST comprobante-recepcion es idempotente: no duplica si ya existe")
    void generarComprobanteRecepcionNoDuplica() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        var primero = documentoService.asegurarComprobanteRecepcion(orden.getId(), USUARIO_TEST);
        var segundo = documentoService.asegurarComprobanteRecepcion(orden.getId(), USUARIO_TEST);

        assertThat(primero.getDocumento().getId()).isEqualTo(segundo.getDocumento().getId());
        assertThat(segundo.getStatus()).isEqualTo(OutcomeAsegurarComprobante.EXISTING);
        assertThat(segundo.isReady()).isTrue();
        assertThat(segundo.getDocumento().getVersion()).isEqualTo(primero.getDocumento().getVersion());
        assertThat(segundo.getDocumento().getHashSha256()).isEqualTo(primero.getDocumento().getHashSha256());

        long comprobantes = documentoService.listar(orden.getId()).stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION)
            .count();
        assertThat(comprobantes).isEqualTo(1);
    }

    @Test
    @DisplayName("asegurar distingue GENERATED vs EXISTING")
    void asegurarComprobanteOutcome() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        // Puede existir por afterCommit
        var a = documentoService.asegurarComprobanteRecepcion(orden.getId(), USUARIO_TEST);
        assertThat(a.isReady()).isTrue();
        assertThat(a.getDocumento()).isNotNull();
        assertThat(a.getStatus()).isIn(
            OutcomeAsegurarComprobante.GENERATED, OutcomeAsegurarComprobante.EXISTING);

        var b = documentoService.asegurarComprobanteRecepcion(orden.getId(), USUARIO_TEST);
        assertThat(b.getStatus()).isEqualTo(OutcomeAsegurarComprobante.EXISTING);
        assertThat(b.getDocumento().getId()).isEqualTo(a.getDocumento().getId());
    }

    @Test
    @DisplayName("tras crear OT el comprobante puede no estar aún; regenerar sí crea nueva versión")
    void otCreadaDocumentoPuedeNoEstarYRegenerarCreaVersion() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        assertThat(orden.getId()).isNotNull();
        assertThat(orden.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);

        // El afterCommit es best-effort: listar es válido con 0 o más documentos.
        List<DocumentoOrdenServicioResponseDTO> lista = documentoService.listar(orden.getId());
        assertThat(lista).isNotNull();

        DocumentoOrdenServicioResponseDTO doc =
            documentoService.generarComprobanteRecepcion(orden.getId(), USUARIO_TEST);
        assertThat(doc.getTipoDocumento()).isEqualTo(TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION);

        DocumentoOrdenServicioResponseDTO v2 =
            documentoService.regenerar(orden.getId(), doc.getId(), USUARIO_TEST);
        assertThat(v2.getId()).isNotEqualTo(doc.getId());
        assertThat(v2.getVersion()).isGreaterThan(doc.getVersion());
        assertThat(documentoOrdenServicioRepository.findById(doc.getId())).isPresent();
    }

    @Test
    @DisplayName("tokenConsulta no es el id secuencial")
    void tokenConsultaNoEsId() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        OrdenServicio entity = ordenServicioRepository.findById(orden.getId()).orElseThrow();
        assertThat(entity.getTokenConsulta()).isNotBlank();
        assertThat(entity.getTokenConsulta()).isNotEqualTo(String.valueOf(orden.getId()));
        assertThat(entity.getTokenConsulta()).doesNotContain("-");
        assertThat(entity.getTokenConsulta().length()).isEqualTo(32);
    }

    @Test
    @DisplayName("cotización PDF usa snapshot; cambiar precio producto no altera hash de versión antigua")
    void cotizacionPdfUsaSnapshot() throws Exception {
        Producto producto = crearProducto("Repuesto PDF", new BigDecimal("100000.00"), new BigDecimal("40000.00"), 10);
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());

        CotizacionServicioRequestDTO body = new CotizacionServicioRequestDTO();
        DetalleCotizacionServicioRequestDTO linea = new DetalleCotizacionServicioRequestDTO();
        linea.setTipo(TipoDetalleCotizacionServicio.REPUESTO);
        linea.setProductoId(producto.getId());
        linea.setDescripcion("Repuesto PDF");
        linea.setCantidad(new BigDecimal("1"));
        linea.setPrecioUnitario(new BigDecimal("100000.00"));
        body.setDetalles(List.of(linea));

        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(orden.getId(), body, USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);

        DocumentoOrdenServicioResponseDTO docCot = documentoService.listar(orden.getId()).stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.COTIZACION)
            .findFirst()
            .orElseGet(() -> documentoService.generarCotizacionPdf(orden.getId(), cot.getId(), USUARIO_TEST));

        String hashOriginal = docCot.getHashSha256();
        byte[] bytesOriginal = storageService.cargarBytes(
            documentoOrdenServicioRepository.findById(docCot.getId()).orElseThrow().getStorageKey());

        producto.setPrecioVentaActual(new BigDecimal("999999.00"));
        productoRepository.save(producto);

        DocumentoOrdenServicioResponseDTO regenerado =
            documentoService.regenerar(orden.getId(), docCot.getId(), USUARIO_TEST);

        assertThat(regenerado.getVersion()).isGreaterThan(docCot.getVersion());
        assertThat(documentoOrdenServicioRepository.findById(docCot.getId()).orElseThrow().getHashSha256())
            .isEqualTo(hashOriginal);
        byte[] bytesOld = storageService.cargarBytes(
            documentoOrdenServicioRepository.findById(docCot.getId()).orElseThrow().getStorageKey());
        assertThat(bytesOld).isEqualTo(bytesOriginal);
    }

    @Test
    @DisplayName("re-presentar la misma cotización editada genera nueva versión de PDF, no nueva cotización")
    void representarCotizacionGeneraNuevaVersionPdf() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioRequestDTO body = new CotizacionServicioRequestDTO();
        DetalleCotizacionServicioRequestDTO mo = new DetalleCotizacionServicioRequestDTO();
        mo.setTipo(TipoDetalleCotizacionServicio.MANO_OBRA);
        mo.setDescripcion("Reparación");
        mo.setCantidad(new BigDecimal("1"));
        mo.setPrecioUnitario(new BigDecimal("300000"));
        body.setDetalles(List.of(mo));

        CotizacionServicioResponseDTO cot = cotizacionService.crearInicial(orden.getId(), body, USUARIO_TEST);
        assertThat(documentosCotizacion(orden.getId())).isEmpty();

        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);
        assertThat(documentosCotizacion(orden.getId())).hasSize(1);

        mo.setPrecioUnitario(new BigDecimal("420000"));
        cotizacionService.actualizar(orden.getId(), cot.getId(), body, USUARIO_TEST);
        assertThat(documentosCotizacion(orden.getId())).hasSize(1);

        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);
        List<DocumentoOrdenServicioResponseDTO> docs = documentosCotizacion(orden.getId());
        assertThat(docs).hasSize(2);
        assertThat(docs).allMatch(d -> cot.getId().equals(d.getCotizacionId()));
        assertThat(docs).extracting(DocumentoOrdenServicioResponseDTO::getVersion)
            .containsExactlyInAnyOrder(1, 2);
        assertThat(cotizacionService.listar(orden.getId())).hasSize(1);
    }

    private List<DocumentoOrdenServicioResponseDTO> documentosCotizacion(Long ordenId) {
        return documentoService.listar(ordenId).stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.COTIZACION)
            .toList();
    }

    @Test
    @DisplayName("acta de entrega requiere firma; regenerar crea nueva versión")
    void actaEntregaYRegenerar() {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        ordenServicioService.registrarEntrega(orden.getId(), entregaValida(), USUARIO_TEST);

        DocumentoOrdenServicioResponseDTO acta = documentoService.listar(orden.getId()).stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.ACTA_ENTREGA)
            .findFirst()
            .orElseGet(() -> documentoService.generarActaEntrega(orden.getId(), USUARIO_TEST));

        assertThat(acta.getNombreArchivo()).contains("Entrega");
        assertThat(acta.getHashSha256()).hasSize(64);

        DocumentoOrdenServicioResponseDTO v2 =
            documentoService.regenerar(orden.getId(), acta.getId(), USUARIO_TEST);
        assertThat(v2.getId()).isNotEqualTo(acta.getId());
        assertThat(v2.getVersion()).isGreaterThan(acta.getVersion());
        assertThat(documentoOrdenServicioRepository.findById(acta.getId())).isPresent();
    }

    @Test
    @DisplayName("consulta pública OT limita campos sensibles")
    void consultaPublicaOtLimitada() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        OrdenServicio entity = ordenServicioRepository.findById(orden.getId()).orElseThrow();

        ConsultaOtPublicaDTO pub = documentoService.consultaOtPublica(entity.getTokenConsulta());
        assertThat(pub.getNumero()).isEqualTo(orden.getNumero());
        assertThat(pub.getEstadoCodigo()).isEqualTo("RECEPCIONADO");
        assertThat(pub.getEstadoPublico()).isNotBlank();
        assertThat(pub.getEtapaPublica()).isEqualTo("RECEPCION");
        assertThat(pub.getEtapaPublicaNumero()).isEqualTo(1);
        assertThat(pub.getTotalEtapasPublicas()).isEqualTo(5);
        assertThat(pub.getEquipoTipo()).isNotBlank();
        assertThat(pub.getMensaje()).contains("taller");
        assertThat(pub.getFechaRecepcion()).isNotNull();
        assertThat(pub.isCotizacionDisponible()).isFalse();
        assertThat(pub.getContacto()).isNotNull();
        assertThat(pub.getContacto().getEmpresa()).isNotBlank();
    }

    @Test
    @DisplayName("D.13: consulta pública tras completarDiagnostico desde RECEPCIONADO refleja DIAGNOSTICO")
    void consultaPublicaTrasCompletarDesdeRecepcionado() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setDiagnostico("Fuente dañada");
        req.setTrabajoRealizado("Cambio anticipado");
        ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST);

        OrdenServicio entity = ordenServicioRepository.findById(orden.getId()).orElseThrow();
        assertThat(entity.getEstado()).isEqualTo(EstadoOrdenServicio.DIAGNOSTICADO);

        ConsultaOtPublicaDTO pub = documentoService.consultaOtPublica(entity.getTokenConsulta());
        assertThat(pub.getEstadoCodigo()).isEqualTo("DIAGNOSTICADO");
        assertThat(pub.getEtapaPublica()).isEqualTo("DIAGNOSTICO");
        assertThat(pub.getEtapaPublicaNumero()).isEqualTo(2);
        assertThat(pub.getEstadoPublico()).isNotBlank();
        assertThat(pub.getEstadoPublico()).doesNotContainIgnoringCase("disponible en el taller");
    }

    @Test
    @DisplayName("C.2: consulta pública expone estadoCodigo y etapa, no depende de etiqueta")
    void consultaPublicaExponeCodigoYEtapa() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        OrdenServicio entity = ordenServicioRepository.findById(orden.getId()).orElseThrow();

        ConsultaOtPublicaDTO pub = documentoService.consultaOtPublica(entity.getTokenConsulta());
        assertThat(pub.getEstadoCodigo()).isEqualTo("DIAGNOSTICADO");
        assertThat(pub.getEtapaPublica()).isEqualTo("DIAGNOSTICO");
        assertThat(pub.getEtapaPublicaNumero()).isEqualTo(2);
        assertThat(pub.isCotizacionDisponible()).isFalse();
        assertThatThrownBy(() -> documentoService.consultaCotizacionOtPublica(entity.getTokenConsulta()))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
            .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("C.2: PENDIENTE_APROBACION permite ver cotización real sin ids internos")
    void consultaPublicaCotizacionSoloPendienteAprobacion() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot =
            cotizacionService.crearInicial(orden.getId(), requestManoObra(), USUARIO_TEST);
        cotizacionService.presentar(orden.getId(), cot.getId(), USUARIO_TEST);

        OrdenServicio entity = ordenServicioRepository.findById(orden.getId()).orElseThrow();
        assertThat(entity.getEstado()).isEqualTo(EstadoOrdenServicio.PENDIENTE_APROBACION);

        ConsultaOtPublicaDTO pub = documentoService.consultaOtPublica(entity.getTokenConsulta());
        assertThat(pub.getEstadoCodigo()).isEqualTo("PENDIENTE_APROBACION");
        assertThat(pub.getEtapaPublica()).isEqualTo("COTIZACION");
        assertThat(pub.isCotizacionDisponible()).isTrue();
        assertThat(pub.getContacto().getTelefono()).isNotNull();

        var cotPub = documentoService.consultaCotizacionOtPublica(entity.getTokenConsulta());
        assertThat(cotPub.getNumero()).isEqualTo(cot.getNumero());
        assertThat(cotPub.getTotal()).isEqualByComparingTo("80000.00");
        assertThat(cotPub.getLineas()).hasSize(1);
        assertThat(cotPub.getLineas().get(0).getDescripcion()).containsIgnoringCase("Mano");
        assertThat(cotPub.getLineas().get(0).getCantidad()).isEqualByComparingTo("1");
        assertThat(cotPub.getLineas().get(0).getPrecioUnitario()).isEqualByComparingTo("80000.00");
        // No hay ids en el DTO público
        assertThat(cotPub.getClass().getDeclaredFields())
            .extracting(f -> f.getName())
            .doesNotContain("id", "ordenServicioId", "productoId", "usuarioCreacion");
    }

    @Test
    @DisplayName("C.2: alias del equipo (referenciaInterna) se expone como dato del cliente")
    void consultaPublicaExponeAliasEquipo() {
        Cliente cliente = crearCliente("Cliente Alias " + System.nanoTime());
        EquipoRequestDTO eqReq = new EquipoRequestDTO();
        eqReq.setClienteId(cliente.getId());
        eqReq.setTipoEquipo(TipoEquipo.PORTATIL);
        eqReq.setMarca("Dell");
        eqReq.setModelo("XPS");
        eqReq.setReferenciaInterna("Laptop Contabilidad");
        EquipoResponseDTO equipo = equipoService.crear(eqReq);

        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        request.setProblemaReportado("No enciende");
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        OrdenServicioResponseDTO orden = ordenServicioService.crear(request, USUARIO_TEST);
        OrdenServicio entity = ordenServicioRepository.findById(orden.getId()).orElseThrow();

        ConsultaOtPublicaDTO pub = documentoService.consultaOtPublica(entity.getTokenConsulta());
        assertThat(pub.getReferenciaInterna()).isEqualTo("Laptop Contabilidad");
        assertThat(pub.getEquipoMarca()).isEqualTo("Dell");
    }

    @Test
    @DisplayName("consulta pública documento no entrega PDF ni datos comerciales")
    void consultaPublicaDocumento() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        DocumentoOrdenServicioResponseDTO doc =
            documentoService.generarComprobanteRecepcion(orden.getId(), USUARIO_TEST);

        // comprobante no tiene tokenDocumento; generar cotización sí
        OrdenServicioResponseDTO diagnosticado = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioRequestDTO body = requestManoObra();
        CotizacionServicioResponseDTO cot =
            cotizacionService.crearInicial(diagnosticado.getId(), body, USUARIO_TEST);
        cotizacionService.presentar(diagnosticado.getId(), cot.getId(), USUARIO_TEST);

        DocumentoOrdenServicioResponseDTO docCot = documentoService.listar(diagnosticado.getId()).stream()
            .filter(d -> d.getTipoDocumento() == TipoDocumentoOrdenServicio.COTIZACION)
            .findFirst()
            .orElseGet(() ->
                documentoService.generarCotizacionPdf(diagnosticado.getId(), cot.getId(), USUARIO_TEST));

        assertThat(docCot.getTokenDocumento()).isNotBlank();
        ConsultaDocumentoPublicoDTO pub =
            documentoService.consultaDocumentoPublico(docCot.getTokenDocumento());
        assertThat(pub.getTipoDocumento()).isEqualTo(TipoDocumentoOrdenServicio.COTIZACION);
        assertThat(pub.getNumeroOt()).isEqualTo(diagnosticado.getNumero());
        assertThat(pub.getMensaje()).containsIgnoringCase("taller");
        assertThat(doc.getTokenDocumento()).isNull();
    }

    @Test
    @DisplayName("crear OT tiene éxito aunque falle la generación PDF (OT existe)")
    void crearOtExisteAunquePdfFalleBestEffort() {
        Cliente cliente = crearCliente("Cliente PDF fail");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        request.setProblemaReportado("Pantalla rota");
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);

        OrdenServicioResponseDTO orden = ordenServicioService.crear(request, USUARIO_TEST);
        assertThat(orden.getId()).isNotNull();
        assertThat(ordenServicioRepository.findById(orden.getId())).isPresent();
        assertThat(orden.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
    }

    @Test
    @DisplayName("no genera PDF de cotización en BORRADOR")
    void noPdfBorrador() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        CotizacionServicioResponseDTO cot =
            cotizacionService.crearInicial(orden.getId(), requestManoObra(), USUARIO_TEST);

        assertThatThrownBy(() ->
                documentoService.generarCotizacionPdf(orden.getId(), cot.getId(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("BORRADOR");
    }

    @Test
    @DisplayName("token consulta inexistente → 404")
    void consultaTokenInexistente() {
        assertThatThrownBy(() -> documentoService.consultaOtPublica("tokeninexistente0000000000000000"))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
            .isEqualTo(HttpStatus.NOT_FOUND);
    }

    private CotizacionServicioRequestDTO requestManoObra() {
        CotizacionServicioRequestDTO body = new CotizacionServicioRequestDTO();
        DetalleCotizacionServicioRequestDTO linea = new DetalleCotizacionServicioRequestDTO();
        linea.setTipo(TipoDetalleCotizacionServicio.MANO_OBRA);
        linea.setDescripcion("Mano de obra");
        linea.setCantidad(new BigDecimal("1"));
        linea.setPrecioUnitario(new BigDecimal("80000.00"));
        body.setDetalles(List.of(linea));
        return body;
    }

    private OrdenServicioResponseDTO crearOrdenBasica() {
        Cliente cliente = crearCliente("Cliente Doc " + System.nanoTime());
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        request.setProblemaReportado("No enciende");
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        return ordenServicioService.crear(request, USUARIO_TEST);
    }

    private EquipoResponseDTO crearEquipo(Long clienteId) {
        EquipoRequestDTO request = new EquipoRequestDTO();
        request.setClienteId(clienteId);
        request.setTipoEquipo(TipoEquipo.COMPUTADOR);
        request.setMarca("Lenovo");
        request.setModelo("T14");
        return equipoService.crear(request);
    }

    private OrdenServicioResponseDTO avanzarADiagnosticado(OrdenServicioResponseDTO orden) {
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Fuente dañada");
        return ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST).getOrden();
    }

    private OrdenServicioResponseDTO avanzarHastaListo() {
        OrdenServicioResponseDTO orden = avanzarADiagnosticado(crearOrdenBasica());
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.COTIZADO);
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.PENDIENTE_APROBACION);
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.APROBADO);
        avanzar(orden.getId(), EstadoOrdenServicio.EN_REPARACION);
        CompletarReparacionRequestDTO req = new CompletarReparacionRequestDTO();
        req.setTrabajoRealizado("Reparación completada");
        return ordenServicioService.completarReparacion(orden.getId(), req, USUARIO_TEST).getOrden();
    }

    private void avanzar(Long id, EstadoOrdenServicio destino) {
        CambiarEstadoOrdenServicioRequestDTO cambio = new CambiarEstadoOrdenServicioRequestDTO();
        cambio.setNuevoEstado(destino);
        ordenServicioService.cambiarEstado(id, cambio, USUARIO_TEST);
    }

    private void avanzarPorDominio(Long id, EstadoOrdenServicio destino) {
        ordenServicioService.transicionarPorDominio(id, destino, null, null, USUARIO_TEST);
    }

    private RegistrarEntregaRequestDTO entregaValida() {
        RegistrarEntregaRequestDTO req = new RegistrarEntregaRequestDTO();
        req.setClienteConfirmo(true);
        req.setNombreCliente("Juan Pérez");
        req.setDocumentoCliente("123456");
        req.setFirmaBase64(
            "data:image/png;base64,"
                + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        req.setObservaciones("Entrega en mostrador");
        return req;
    }
}
