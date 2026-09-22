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

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

/**
 * Renderiza HTML de plantillas a PDF LETTER (decisión FASE 3.15.8 para documentos comerciales Colombia).
 */
@Service
public class HtmlToPdfService {

    public static final String TEMPLATES_BASE = "templates/documentos/servicios/";
    public static final String CLASSPATH_BASE_URI = "classpath:/" + TEMPLATES_BASE;

    private static final Pattern LINK_STYLESHEET = Pattern.compile(
        "<link\\s+rel=\"stylesheet\"\\s+(?:type=\"text/css\"\\s+)?href=\"(styles/[^\"]+\\.css)\"\\s*/?>",
        Pattern.CASE_INSENSITIVE);

    public byte[] renderDesdeClasspath(String templateRelativePath, Map<String, String> placeholders) {
        String html = cargarPlantilla(templateRelativePath);
        html = incrustarCssEnlazados(html);
        if (placeholders != null) {
            for (Map.Entry<String, String> e : placeholders.entrySet()) {
                String key = e.getKey();
                String value = e.getValue() != null ? e.getValue() : "";
                html = html.replace("${" + key + "}", value);
                html = html.replace("{{" + key + "}}", value);
            }
        }
        return htmlAPdf(html);
    }

    /**
     * OpenHTMLToPDF no resuelve {@code classpath:} para CSS externos.
     * Incrusta cada {@code <link rel="stylesheet" href="styles/...css"/>} en {@code <style>}.
     */
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
            builder.withHtmlContent(html, null);
            builder.toStream(baos);
            builder.run();
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
}
