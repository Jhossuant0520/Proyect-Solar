package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Instrumentación temporal C.3: mide etapas de generación PDF (nanoTime → ms).
 * Uso: {@code try (PdfGenTiming t = PdfGenTiming.start(...)) { ... }} en el orquestador;
 * etapas anidadas (HTML/fuentes/logo/QR) leen el contexto vía {@link #current()}.
 *
 * <p>Solo logs. Sin persistencia. Sin cambio funcional.
 */
public final class PdfGenTiming implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(PdfGenTiming.class);
    private static final ThreadLocal<PdfGenTiming> CURRENT = new ThreadLocal<>();

    private final String type;
    private final String entityId;
    private final String genId;
    private final long startNanos;

    private long dataMs;
    private long companyVarsMs;
    private long templateMs;
    private long htmlMs;
    private long fontsMs;
    private int fontsCount;
    private long fontsBytes;
    private long logoMs;
    private long logoBytes;
    private long qrMs;
    private long signatureMs;
    private long signatureReadMs;
    private long signatureCropMs;
    private long renderMs;
    private long fileMs;
    private long dbMs;

    private boolean closed;

    private PdfGenTiming(String type, String entityId) {
        this.type = type != null ? type : "UNKNOWN";
        this.entityId = entityId != null ? entityId : "-";
        this.genId = UUID.randomUUID().toString().substring(0, 8);
        this.startNanos = System.nanoTime();
    }

    public static PdfGenTiming start(String type, Object entityId) {
        PdfGenTiming previous = CURRENT.get();
        if (previous != null && !previous.closed) {
            log.warn("PDF-GEN nested start ignored previous type={} id={}", previous.type, previous.entityId);
            previous.closeQuietly();
        }
        PdfGenTiming timing = new PdfGenTiming(type, entityId == null ? null : String.valueOf(entityId));
        CURRENT.set(timing);
        if (log.isDebugEnabled()) {
            log.debug("PDF-GEN [{}] [id={}] [gen={}] start", timing.type, timing.entityId, timing.genId);
        }
        return timing;
    }

    public static PdfGenTiming current() {
        return CURRENT.get();
    }

    public String type() {
        return type;
    }

    public String entityId() {
        return entityId;
    }

    public String genId() {
        return genId;
    }

    public static long elapsedMs(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000L;
    }

    public static long measure(Runnable action) {
        long t0 = System.nanoTime();
        action.run();
        return elapsedMs(t0);
    }

    public static <T> T measure(Supplier<T> action, java.util.function.LongConsumer consumer) {
        long t0 = System.nanoTime();
        T value = action.get();
        consumer.accept(elapsedMs(t0));
        return value;
    }

    public void addDataMs(long ms) {
        this.dataMs += ms;
        debugStage("data-loaded", ms);
    }

    public void addCompanyVarsMs(long ms) {
        this.companyVarsMs += ms;
        debugStage("company-vars", ms);
    }

    public void addTemplateMs(long ms) {
        this.templateMs += ms;
        debugStage("template-loaded", ms);
    }

    public void addHtmlMs(long ms) {
        this.htmlMs += ms;
        debugStage("html-built", ms);
    }

    public void addFonts(long ms, int count, long bytes) {
        this.fontsMs += ms;
        this.fontsCount += count;
        this.fontsBytes += bytes;
        debugStage("fonts-loaded", ms, Map.of("count", count, "bytes", bytes));
    }

    public void addLogo(long ms, long bytes) {
        this.logoMs += ms;
        this.logoBytes += bytes;
        debugStage("logo-loaded", ms, Map.of("bytes", bytes));
    }

    public void addQrMs(long ms) {
        this.qrMs += ms;
        debugStage("qr-built", ms);
    }

    public void addSignature(long totalMs, long readMs, long cropMs) {
        this.signatureMs += totalMs;
        this.signatureReadMs += readMs;
        this.signatureCropMs += cropMs;
        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("readMs", readMs);
        extra.put("cropMs", cropMs);
        debugStage("signature-processed", totalMs, extra);
    }

    public void addRenderMs(long ms) {
        this.renderMs += ms;
        debugStage("pdf-rendered", ms);
    }

    public void addFileMs(long ms) {
        this.fileMs += ms;
        debugStage("file-written", ms);
    }

    public void addDbMs(long ms) {
        this.dbMs += ms;
        debugStage("document-saved", ms);
    }

    private void debugStage(String stage, long ms) {
        debugStage(stage, ms, Map.of());
    }

    private void debugStage(String stage, long ms, Map<String, ?> extra) {
        if (!log.isDebugEnabled()) {
            return;
        }
        StringBuilder sb = new StringBuilder();
        sb.append("PDF-GEN [").append(type).append("] [id=").append(entityId)
            .append("] [gen=").append(genId).append("] ")
            .append(stage).append(" +").append(ms).append(" ms");
        for (Map.Entry<String, ?> e : extra.entrySet()) {
            sb.append(' ').append(e.getKey()).append('=').append(e.getValue());
        }
        log.debug(sb.toString());
    }

    @Override
    public void close() {
        if (closed) {
            return;
        }
        closed = true;
        long totalMs = elapsedMs(startNanos);
        // Resumen INFO: una línea por generación.
        log.info(
            "PDF-GEN type={} id={} gen={} totalMs={} dataMs={} companyVarsMs={} templateMs={} htmlMs={} "
                + "fontsMs={} fontsCount={} fontsBytes={} logoMs={} logoBytes={} qrMs={} "
                + "signatureMs={} renderMs={} fileMs={} dbMs={}",
            type, entityId, genId, totalMs,
            dataMs, companyVarsMs, templateMs, htmlMs,
            fontsMs, fontsCount, fontsBytes, logoMs, logoBytes, qrMs,
            signatureMs, renderMs, fileMs, dbMs);
        if (log.isDebugEnabled()) {
            log.debug(
                "PDF-GEN [{}] [id={}] [gen={}] total +{} ms (signatureReadMs={} signatureCropMs={})",
                type, entityId, genId, totalMs, signatureReadMs, signatureCropMs);
        }
        if (CURRENT.get() == this) {
            CURRENT.remove();
        }
    }

    private void closeQuietly() {
        try {
            close();
        } catch (Exception ignored) {
            // instrumentación solamente
        }
    }
}
