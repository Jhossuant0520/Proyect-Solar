package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Estado de una devolución a proveedor. En ambos estados la mercancía ya salió del
 * inventario; lo que distingue REEMBOLSADA es que el proveedor ya compensó el importe.
 *
 * <p>Se mantiene separado de {@code EstadoDevolucionVenta} para no acoplar los ciclos de
 * venta y compra, que pueden divergir (por ejemplo con estados de tránsito hacia el proveedor).
 */
public enum EstadoDevolucionCompra {
    REGISTRADA,
    REEMBOLSADA
}
