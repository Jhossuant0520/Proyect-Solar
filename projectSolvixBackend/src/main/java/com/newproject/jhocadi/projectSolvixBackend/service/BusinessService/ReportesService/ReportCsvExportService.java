package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ReportesService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;

import org.springframework.stereotype.Service;

/**
 * Motor CSV Nivel 1 para Reportes.
 *
 * <p>No calcula métricas: solo serializa filas ya resueltas. Escribe a un
 * {@link PrintWriter} sobre un buffer en memoria porque los DTOs de Analytics
 * ya vienen agregados (series temporales / rankings), no el detalle operativo
 * completo.
 *
 * <p><b>Contrato CSV oficial (Excel LATAM):</b>
 * <ul>
 *   <li>Separador de columnas: {@code ;} (punto y coma — separador de listas
 *       regional es-CO / es-MX / es-AR, etc.).</li>
 *   <li>BOM UTF-8 ({@code U+FEFF}) al inicio para Excel.</li>
 *   <li>Escape: campos con {@code ;}, {@code ,}, {@code "}, {@code \n} o {@code \r}
 *       van entre comillas dobles; {@code "} interno se duplica ({@code ""}).</li>
 *   <li>Valores numéricos se serializan con {@link Objects#toString} (sin formato
 *       visual arbitrario).</li>
 * </ul>
 */
@Service
public class ReportCsvExportService {

    /** BOM UTF-8: Excel reconoce acentos/ñ al abrir el CSV. */
    public static final byte[] UTF8_BOM = new byte[] {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    /** Separador de columnas compatible con Excel en locales es-* (Latinoamérica). */
    public static final char COLUMN_SEPARATOR = ';';

    public byte[] toCsv(Consumer<PrintWriter> writer) {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream(8 * 1024);
        try {
            buffer.write(UTF8_BOM);
            try (PrintWriter out = new PrintWriter(
                    new OutputStreamWriter(buffer, StandardCharsets.UTF_8), false)) {
                writer.accept(out);
                out.flush();
            }
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el CSV del reporte.", e);
        }
        return buffer.toByteArray();
    }

    public void writeRow(PrintWriter out, String... columns) {
        if (columns == null || columns.length == 0) {
            out.println();
            return;
        }
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < columns.length; i++) {
            if (i > 0) {
                line.append(COLUMN_SEPARATOR);
            }
            line.append(escape(columns[i]));
        }
        out.println(line);
    }

    public void writeRows(PrintWriter out, List<String[]> rows) {
        if (rows == null) {
            return;
        }
        for (String[] row : rows) {
            writeRow(out, row);
        }
    }

    public String escape(String value) {
        if (value == null) {
            return "";
        }
        boolean needsQuotes = value.indexOf(COLUMN_SEPARATOR) >= 0
            || value.indexOf(',') >= 0
            || value.indexOf('"') >= 0
            || value.indexOf('\n') >= 0
            || value.indexOf('\r') >= 0;
        String normalized = value.replace("\"", "\"\"");
        return needsQuotes ? "\"" + normalized + "\"" : normalized;
    }

    public String cell(Object value) {
        if (value == null) {
            return "";
        }
        return Objects.toString(value, "");
    }
}
