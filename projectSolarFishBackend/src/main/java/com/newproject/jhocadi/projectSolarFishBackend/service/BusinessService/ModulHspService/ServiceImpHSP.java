package com.newproject.jhocadi.projectSolarFishBackend.service.BusinessService.ModulHspService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulHSPDtos.RequestHSP;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulHSPDtos.ResponseHSP;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulHSPDtos.ResponseHSPMes;
import com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulHSPModel.modelHSP;
import com.newproject.jhocadi.projectSolarFishBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.BusinessRepo.ModulHspRepo.RepositoryHSP;
import com.newproject.jhocadi.projectSolarFishBackend.repository.AccesRepo.repositoryUsuario;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;


import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// ── Interface ──────────────────────────────────────────────────────────────
interface ServiceHSP {
    ResponseHSP calcular(RequestHSP request);
    ResponseHSP calcularYGuardar(RequestHSP request, String nombreUsuario);
}

// ── Implementación ─────────────────────────────────────────────────────────
@Service
@RequiredArgsConstructor
public class ServiceImpHSP implements ServiceHSP {

    private final RestTemplate     restTemplate;
    private final RepositoryHSP    hspRepo;
    private final repositoryUsuario usuarioRepo;
    private final ObjectMapper      objectMapper;

    private static final int[]    DIAS_MES   = {31,28,31,30,31,30,31,31,30,31,30,31};
    private static final String[] NOMBRES    = {"Enero","Febrero","Marzo","Abril","Mayo",
                                                 "Junio","Julio","Agosto","Septiembre",
                                                 "Octubre","Noviembre","Diciembre"};
    // Años a intentar en orden descendente
    private static final int[]    ANIOS_PVGIS = {2023, 2022, 2020};

    @Override
    public ResponseHSP calcular(RequestHSP request) {
        return calcularInterno(request);
    }

    @Override
    public ResponseHSP calcularYGuardar(RequestHSP request, String nombreUsuario) {
        ResponseHSP response = calcularInterno(request);

        modelUsuario usuario = usuarioRepo.findByNombreUsuario(nombreUsuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        try {
            String mesesJson = objectMapper.writeValueAsString(response.getMeses());

            modelHSP entidad = modelHSP.builder()
                    .usuario(usuario)
                    .latitud(response.getLatitud())
                    .longitud(response.getLongitud())
                    .anioConsultado(response.getAnioConsultado())
                    .slopeAngle(response.getSlopeAngle())
                    .azimuthAngle(response.getAzimuthAngle())
                    .hspCritica(response.getHspCritica())
                    .mesCritico(response.getMesCritico())
                    .hspFavorable(response.getHspFavorable())
                    .mesFavorable(response.getMesFavorable())
                    .hspPromedio(response.getHspPromedio())
                    .hspDiseno(response.getHspDiseno())
                    .mesesJson(mesesJson)
                    .build();

            hspRepo.save(entidad);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error al guardar resultado HSP: " + e.getMessage());
        }

        return response;
    }

    // ── Lógica central ──────────────────────────────────────────────────────
    private ResponseHSP calcularInterno(RequestHSP request) {
    JsonNode pvgisJson = llamarPVGIS(request.getLatitud(), request.getLongitud());

    // ── Paths corregidos según raw real de PVGIS ──────────────────────────
    JsonNode plane = pvgisJson.path("inputs")
                              .path("plane")
                              .path("fixed_inclined_optimal"); // ← era "mounting_system.fixed"

    double slopeAngle   = plane.path("slope").path("value").asDouble();
    double azimuthAngle = plane.path("azimuth").path("value").asDouble();

    int anio = pvgisJson.path("inputs")
                        .path("meteo_data")
                        .path("year_max").asInt(); // ← este path sí era correcto

    // ── Datos mensuales ───────────────────────────────────────────────────
    JsonNode monthly = pvgisJson.path("outputs").path("monthly");
    List<ResponseHSPMes> meses = new ArrayList<>();

    for (int i = 0; i < 12; i++) {
        JsonNode mes  = monthly.get(i);
        double hOptM  = mes.path("H(i_opt)_m").asDouble(); // ← confirmado en raw
        int    dias   = DIAS_MES[i];
        double hspDia = Math.round((hOptM / dias) * 10000.0) / 10000.0;
        meses.add(new ResponseHSPMes(i + 1, NOMBRES[i], dias, hOptM, hspDia));
    }

    // ── HSP crítica, favorable, promedio, diseño ──────────────────────────
    ResponseHSPMes critico   = meses.stream()
            .min(Comparator.comparingDouble(ResponseHSPMes::getHspDiaria)).orElseThrow();
    ResponseHSPMes favorable = meses.stream()
            .max(Comparator.comparingDouble(ResponseHSPMes::getHspDiaria)).orElseThrow();

    double sumaHOptM   = meses.stream().mapToDouble(ResponseHSPMes::getHOptM).sum();
    double hspPromedio = Math.round((sumaHOptM / 365.0) * 10000.0) / 10000.0;
    double hspDiseno   = Math.round((critico.getHspDiaria() * 0.85) * 10000.0) / 10000.0;

    ResponseHSP response = new ResponseHSP();
    response.setLatitud(request.getLatitud());
    response.setLongitud(request.getLongitud());
    response.setAnioConsultado(anio);
    response.setSlopeAngle(slopeAngle);
    response.setAzimuthAngle(azimuthAngle);
    response.setMeses(meses);
    response.setHspCritica(critico.getHspDiaria());
    response.setMesCritico(critico.getMes());
    response.setNombreMesCritico(critico.getNombreMes());
    response.setHspFavorable(favorable.getHspDiaria());
    response.setMesFavorable(favorable.getMes());
    response.setNombreMesFavorable(favorable.getNombreMes());
    response.setHspPromedio(hspPromedio);
    response.setHspDiseno(hspDiseno);

    return response;
}

    // ── Llamada a PVGIS con reintento por año ───────────────────────────────
    private JsonNode llamarPVGIS(double lat, double lon) {
        String base = "https://re.jrc.ec.europa.eu/api/v5_3/MRcalc"
                + "?lat={lat}&lon={lon}"
                + "&horirrad=0"      // no necesitamos horizontal
                + "&optrad=1"        // ← ESTO faltaba: irradiación en plano óptimo
                + "&selectrad=0"
                + "&optimalangles=1" // calcula slope y azimuth óptimos
                + "&mountingplace=building"
                + "&outputformat=json"
                + "&startyear={year}&endyear={year}"
                + "&raddatabase=PVGIS-ERA5";

        for (int anio : ANIOS_PVGIS) {
            try {
                String url = base
                        .replace("{lat}",  String.valueOf(lat))
                        .replace("{lon}",  String.valueOf(lon))
                        .replace("{year}", String.valueOf(anio));

                String raw = restTemplate.getForObject(url, String.class);
                System.out.println("=== RAW PVGIS ===\n" + raw + "\n=================");
                return objectMapper.readTree(raw);
            } catch (Exception e) {
                System.out.println("Falló año " + anio + ": " + e.getMessage());
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "No se pudo obtener datos de PVGIS para las coordenadas indicadas.");
    }
}
