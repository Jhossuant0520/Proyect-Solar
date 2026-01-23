package com.newproject.jhocadi.projectSolarFishBackend.service;

import org.springframework.stereotype.Service;
import com.newproject.jhocadi.projectSolarFishBackend.repository.DemandaEnergeticaRepository;
import com.newproject.jhocadi.projectSolarFishBackend.repository.FincaRepository;
import com.newproject.jhocadi.projectSolarFishBackend.repository.ComponenteEnergeticoRepository;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelDemandaEnergetica;
import com.newproject.jhocadi.projectSolarFishBackend.model.fincaModel;
import com.newproject.jhocadi.projectSolarFishBackend.model.componenteEnergeticoModel;
import java.util.List;

@Service
public class DemandaEnergeticaService {

    private final FincaRepository fincaRepository;
    private final ComponenteEnergeticoRepository componenteRepository;
    private final DemandaEnergeticaRepository demandaRepository;

    public DemandaEnergeticaService(FincaRepository fincaRepository,
                                    ComponenteEnergeticoRepository componenteRepository,
                                    DemandaEnergeticaRepository demandaRepository) {
        this.fincaRepository = fincaRepository;
        this.componenteRepository = componenteRepository;
        this.demandaRepository = demandaRepository;
    }

    public modelDemandaEnergetica calcularDemandaPorFinca(long fincaId) {
        // 1. Obtener la finca
        fincaModel finca = fincaRepository.findById(fincaId)
                .orElseThrow(() -> new RuntimeException("Finca no encontrada"));

        // 2. Obtener todos los componentes de la finca desde la tabla componente_energetico
        List<componenteEnergeticoModel> componentes = componenteRepository.findByFincaId(fincaId);

        double demandaDC = 0.0;
        double demandaAC = 0.0;
        double demandaDiariaTotal = 0.0;

        // 3. Para cada componente se calcula:
        for (componenteEnergeticoModel c : componentes) {
            // 3.1. Factor de Uso: FU = (HorasOperacion_i) / horasRealesPeriodo
            double fu = c.getHorasOperacion() / c.getHorasRealesPeriodo();
            
            // 3.2. Demanda energética Individual: 
            // DemandaEnergetica_i = Potencia_i * Cantidad_i * HorasOperacion(h/dia) * FactorUso
            double demandaIndividual = c.getPotencia() * c.getCantidad() * c.getHorasOperacion() * fu;

            // 4. Clasificación por tipo de energía
            if (c.getTipoEnergia().equals(componenteEnergeticoModel.TipoEnergia.AC)) {
                // Si tipoEnergia = 'AC', se suma a DemandaAC
                demandaAC += demandaIndividual;
            } else {
                // Si tipoEnergia = 'DC', se suma a DemandaDC
                demandaDC += demandaIndividual;
            }

            // 5. DemandaEnergetica_Diaria = ∑DemandaEnergetica_i
            demandaDiariaTotal += demandaIndividual;
        }

        // 6. Aplicación de factor de seguridad para cargas AC:
        // DemandaAC_final = DemandaAC × 2
        double demandaACFinal = demandaAC * 2;

        // 7. Crear objeto de demanda energética
        modelDemandaEnergetica demanda = new modelDemandaEnergetica();
        demanda.setFinca(finca);
        demanda.setDemandaDC(demandaDC);
        demanda.setDemandaAC(demandaACFinal);
        
        // 8. Valores derivados:
        // DemandaEnergetica_Diaria = ∑DemandaEnergetica_i
        demanda.setDemandaDiaria(demandaDiariaTotal);
        // DemandaEnergetica_Mensual = DemandaEnergetica_Diaria * 30
        demanda.setDemandaMensual(demandaDiariaTotal * 30);
        // DemandaEnergeticaAnual = DemandaEnergetica_Diaria * 365
        demanda.setDemandaAnual(demandaDiariaTotal * 365);

        // 9. Almacenar resultados en la tabla demanda_energetica con el idFinca asociado
        return demandaRepository.save(demanda);
    }

    public modelDemandaEnergetica obtenerPorFinca(long fincaId) {
        fincaModel finca = fincaRepository.findById(fincaId)
                .orElseThrow(() -> new RuntimeException("Finca no encontrada"));
        return demandaRepository.findByFinca(finca)
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Demanda no calculada aún para esta finca"));
    }

    public List<modelDemandaEnergetica> listarTodas() {
        return demandaRepository.findAll();
    }

    public void eliminar(long id) {
        demandaRepository.deleteById(id);
    }

    
    
}
