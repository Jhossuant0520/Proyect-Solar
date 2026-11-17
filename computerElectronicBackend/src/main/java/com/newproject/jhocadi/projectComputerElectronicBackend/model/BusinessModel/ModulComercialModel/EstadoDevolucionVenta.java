package com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel;

/**
 * Estado de una devolución. La devolución ya afectó el inventario en ambos estados;
 * lo que distingue REEMBOLSADA es que el dinero ya salió.
 */
public enum EstadoDevolucionVenta {
    REGISTRADA,
    REEMBOLSADA
}
