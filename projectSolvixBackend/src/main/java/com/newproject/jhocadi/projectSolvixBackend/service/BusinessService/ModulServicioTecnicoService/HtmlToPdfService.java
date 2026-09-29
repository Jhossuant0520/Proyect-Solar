package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import lombok.RequiredArgsConstructor;

/**
 * Renderiza HTML de plantillas a PDF LETTER.
 * Fuentes Unicode embebidas (Inter / JetBrains Mono / DejaVu) — sin Helvetica WinAnsi,
 * para que tildes y ñ no se distorsionen.
 *
 * <p>C.3: instrumenta template/html/fonts/render vía {@link PdfGenTiming} si hay contexto activo.
 * <p>C.3.1: bytes TTF vía {@link PdfFontBytesCache} (sin releer classpath en generaciones posteriores).
 */
@Service
@RequiredArgsConstructor
public class HtmlToPdfService {

    public static final String TEMPLATES_BASE = "templates/documentos/servicios/";
    public static final String CLASSPATH_BASE_URI = "classpath:/" + TEMPLATES_BASE;

    private static final Pattern LINK_STYLESHEET = Pattern.compile(
        "<link\\s+rel=\"stylesheet\"\\s+(?:type=\"text/css\"\\s+)?href=\"(styles/[^\"]+\\.css)\"\\s*/?>",
        Pattern.CASE_INSENSITIVE);

    private final PdfFontBytesCache fontBytesCache;

    public byte[] renderDesdeClasspath(String templateRelativePath, Map<String, String> placeholders) {
        String html = construirHtmlDesdeClasspath(templateRelativePath, placeholders);
        return htmlAPdf(html);
    }

    public String construirHtmlDesdeClasspath(String templateRelativePath, Map<String, String> placeholders) {
        long tTemplate = System.nanoTime();
        String html = cargarPlantilla(templateRelativePath);
        html = incrustarCssEnlazados(html);
        PdfGenTiming timing = PdfGenTiming.current();
        if (timing != null) {
            timing.addTemplateMs(PdfGenTiming.elapsedMs(tTemplate));
        }
        long tHtml = System.nanoTime();
        if (placeholders != null) {
            for (Map.Entry<String, String> e : placeholders.entrySet()) {
                String key = e.getKey();
                String value = e.getValue() != null ? e.getValue() : "";
                html = html.replace("${" + key + "}", value);
                html = html.replace("{{" + key + "}}", value);
            }
        }
        if (timing != null) {
            timing.addHtmlMs(PdfGenTiming.elapsedMs(tHtml));
        }
        return html;
    }

    private String incrustarCssEnlazados(String html) {
        Matcher matcher = LINK_STYLESHEET.matcher(html);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String cssPath = matcher.group(1);
            String css = cargarPlantilla(cssPath);
            String style = "<style type=\"text/css\">\n" + css + "\n</style>";
            matcher.appendReplacement(sb, Matcher.quoteReplacement(style));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    public byte[] htmlAPdf(String html) {
        if (html == null || html.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Plantilla HTML vacía.");
        }
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useDefaultPageSize(8.5f, 11f, PdfRendererBuilder.PageSizeUnits.INCHES);

            long tFonts = System.nanoTime();
            FontLoadStats fontStats = registrarFuentesUnicode(builder);
            PdfGenTiming timing = PdfGenTiming.current();
            if (timing != null) {
                timing.addFonts(PdfGenTiming.elapsedMs(tFonts), fontStats.count, fontStats.bytes);
            }

            String htmlUtf8 = asegurarDeclaracionUtf8(html);
            builder.withHtmlContent(htmlUtf8, CLASSPATH_BASE_URI);
            builder.toStream(baos);

            long tRender = System.nanoTime();
            builder.run();
            if (timing != null) {
                timing.addRenderMs(PdfGenTiming.elapsedMs(tRender));
            }

            byte[] pdf = baos.toByteArray();
            if (pdf.length == 0) {
                throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "El PDF generado está vacío.");
            }
            return pdf;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo generar el PDF: " + e.getMessage());
        }
    }

    private FontLoadStats registrarFuentesUnicode(PdfRendererBuilder builder) {
        FontLoadStats stats = new FontLoadStats();
        // Inter
        registrarFuente(builder, "fonts/Inter-Regular.ttf", "Inter", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/Inter-Medium.ttf", "Inter", 500, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/Inter-SemiBold.ttf", "Inter", 600, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/Inter-Bold.ttf", "Inter", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/Inter-ExtraBold.ttf", "Inter", 800, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/Inter-Black.ttf", "Inter", 900, FontStyle.NORMAL, stats);

        // JetBrains Mono
        registrarFuente(builder, "fonts/JetBrainsMono-Regular.ttf", "JetBrains Mono", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/JetBrainsMono-Medium.ttf", "JetBrains Mono", 500, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/JetBrainsMono-SemiBold.ttf", "JetBrains Mono", 600, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/JetBrainsMono-Bold.ttf", "JetBrains Mono", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/JetBrainsMono-ExtraBold.ttf", "JetBrains Mono", 800, FontStyle.NORMAL, stats);

        // DejaVu
        registrarFuente(builder, "fonts/DejaVuSans.ttf", "DejaVu Sans", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSans-Bold.ttf", "DejaVu Sans", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono.ttf", "DejaVu Sans Mono", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono-Bold.ttf", "DejaVu Sans Mono", 700, FontStyle.NORMAL, stats);

        // Alias
        registrarFuente(builder, "fonts/DejaVuSans.ttf", "Helvetica", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSans-Bold.ttf", "Helvetica", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSans.ttf", "Arial", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSans-Bold.ttf", "Arial", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSans.ttf", "sans-serif", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSans-Bold.ttf", "sans-serif", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono.ttf", "Courier", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono-Bold.ttf", "Courier", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono.ttf", "Courier New", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono-Bold.ttf", "Courier New", 700, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono.ttf", "monospace", 400, FontStyle.NORMAL, stats);
        registrarFuente(builder, "fonts/DejaVuSansMono-Bold.ttf", "monospace", 700, FontStyle.NORMAL, stats);
        return stats;
    }

    private void registrarFuente(
            PdfRendererBuilder builder,
            String classpath,
            String family,
            int weight,
            FontStyle style,
            FontLoadStats stats) {
        // C.3.1: bytes desde cache JVM; stream nuevo por registro (API OpenHTMLToPDF).
        final byte[] fontBytes = fontBytesCache.getOrLoad(classpath);
        stats.count++;
        stats.bytes += fontBytes.length;
        builder.useFont(
            () -> new java.io.ByteArrayInputStream(fontBytes),
            family,
            weight,
            style,
            false);
    }

    private static String asegurarDeclaracionUtf8(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }
        String trimmed = html.stripLeading();
        if (trimmed.startsWith("<?xml")) {
            return html;
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + html;
    }

    private String cargarPlantilla(String relativePath) {
        String path = TEMPLATES_BASE + relativePath;
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, "Plantilla no encontrada: " + relativePath);
        }
        try (InputStream in = resource.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo leer la plantilla: " + relativePath);
        }
    }

    private static final class FontLoadStats {
        private int count;
        private long bytes;
    }
}
