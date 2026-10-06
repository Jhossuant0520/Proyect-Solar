package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ReportesService;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ReportCsvExportServiceTest {

    private final ReportCsvExportService service = new ReportCsvExportService();

    @Test
    @DisplayName("CSV incluye BOM UTF-8 al inicio")
    void incluyeBomUtf8() {
        byte[] csv = service.toCsv(out -> service.writeRow(out, "a", "b"));

        assertThat(csv.length).isGreaterThanOrEqualTo(3);
        assertThat(csv[0]).isEqualTo((byte) 0xEF);
        assertThat(csv[1]).isEqualTo((byte) 0xBB);
        assertThat(csv[2]).isEqualTo((byte) 0xBF);
    }

    @Test
    @DisplayName("Caso normal: cabecera y filas con separador ;")
    void casoNormalSeparadorPuntoYComa() {
        byte[] csv = service.toCsv(out -> {
            service.writeRow(out, "section", "metrica", "valor", "estado");
            service.writeRow(out, "kpi", "stockTotal", "17", "OK");
            service.writeRow(out, "kpi", "valorInventario", "1490000.00", "OK");
            service.writeRow(out, "kpi", "stockInicial", "0", "");
        });

        String texto = new String(csv, StandardCharsets.UTF_8);
        assertThat(texto.charAt(0)).isEqualTo('\uFEFF');
        assertThat(texto).contains("section;metrica;valor;estado");
        assertThat(texto).contains("kpi;stockTotal;17;OK");
        assertThat(texto).contains("kpi;valorInventario;1490000.00;OK");
        assertThat(texto).contains("kpi;stockInicial;0;");
        assertThat(texto).doesNotContain("section,metrica");
    }

    @Test
    @DisplayName("CSV genera cabeceras y filas mapeadas con acentos")
    void cabecerasYDatosConAcentos() {
        byte[] csv = service.toCsv(out -> {
            service.writeRow(out, "nombre", "valor");
            service.writeRow(out, "Ventas brutas", "1200.50");
            service.writeRow(out, "Proveedor Ñoño", "abc,\"def\"");
            service.writeRows(out, List.<String[]>of(new String[] {"fila", "2"}));
        });

        String texto = new String(csv, StandardCharsets.UTF_8);
        assertThat(texto.charAt(0)).isEqualTo('\uFEFF');
        assertThat(texto).contains("nombre;valor");
        assertThat(texto).contains("Ventas brutas;1200.50");
        assertThat(texto).contains("Proveedor Ñoño");
        assertThat(texto).contains("\"abc,\"\"def\"\"\"");
        assertThat(texto).contains("fila;2");
    }

    @Test
    @DisplayName("escape deja vacío el null y no altera valores simples / numéricos")
    void escapeBasicoYNumerico() {
        assertThat(service.escape(null)).isEmpty();
        assertThat(service.escape("ok")).isEqualTo("ok");
        assertThat(service.escape("")).isEmpty();
        assertThat(service.cell(null)).isEmpty();
        assertThat(service.cell(42)).isEqualTo("42");
        assertThat(service.cell(new java.math.BigDecimal("1490000.00"))).isEqualTo("1490000.00");
    }

    @Test
    @DisplayName("Texto con coma se cita")
    void textoConComa() {
        assertThat(service.escape("Cámara, H9")).isEqualTo("\"Cámara, H9\"");
    }

    @Test
    @DisplayName("Texto con punto y coma se cita")
    void textoConPuntoYComa() {
        assertThat(service.escape("Producto; edición especial")).isEqualTo("\"Producto; edición especial\"");
    }

    @Test
    @DisplayName("Texto con comillas duplica comillas internas")
    void textoConComillas() {
        assertThat(service.escape("Modelo \"Pro\"")).isEqualTo("\"Modelo \"\"Pro\"\"\"");
    }

    @Test
    @DisplayName("Texto con ñ/acento se preserva en UTF-8")
    void textoConEneYAcento() {
        byte[] csv = service.toCsv(out -> service.writeRow(out, "Información técnica", "ok"));
        String texto = new String(csv, StandardCharsets.UTF_8);
        assertThat(texto).contains("Información técnica;ok");
    }

    @Test
    @DisplayName("Campo vacío permanece vacío entre separadores")
    void campoVacio() {
        byte[] csv = service.toCsv(out -> service.writeRow(out, "kpi", "stockInicial", "0", ""));
        String texto = new String(csv, StandardCharsets.UTF_8);
        assertThat(texto).contains("kpi;stockInicial;0;");
    }

    @Test
    @DisplayName("Salto de línea dentro de texto se cita")
    void saltoDeLinea() {
        assertThat(service.escape("linea1\nlinea2")).isEqualTo("\"linea1\nlinea2\"");
        assertThat(service.escape("linea1\r\nlinea2")).isEqualTo("\"linea1\r\nlinea2\"");
    }

    @Test
    @DisplayName("separador oficial es ; — campos con , ; \" o saltos se citan en fila")
    void escapeSeparadorYSaltosEnFila() {
        assertThat(ReportCsvExportService.COLUMN_SEPARATOR).isEqualTo(';');

        byte[] csv = service.toCsv(out -> {
            service.writeRow(out, "nombre", "nota");
            service.writeRow(out, "Prov, SA", "texto;con;puntoycoma");
            service.writeRow(out, "Multi\nlinea", "ok");
            service.writeRow(out, "Cámara, H9", "Producto; edición especial");
            service.writeRow(out, "Modelo \"Pro\"", "Información técnica");
        });
        String texto = new String(csv, StandardCharsets.UTF_8);
        assertThat(texto.charAt(0)).isEqualTo('\uFEFF');
        assertThat(texto).contains("nombre;nota");
        assertThat(texto).contains("\"Prov, SA\";\"texto;con;puntoycoma\"");
        assertThat(texto).contains("\"Multi\nlinea\";ok");
        assertThat(texto).contains("\"Cámara, H9\";\"Producto; edición especial\"");
        assertThat(texto).contains("\"Modelo \"\"Pro\"\"\";Información técnica");
    }
}
