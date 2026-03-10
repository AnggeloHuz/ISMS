import pool from '../config/database.js';

/**
 * Registra una nueva compra (Transaccional).
 * Actualiza inventario y resta saldos bancarios.
 *
 * @param {Object} data
 * @param {number} data.id_usuario          Usuario que registra (del token)
 * @param {number} data.id_proveedor        Proveedor
 * @param {number} data.tasa_cambio_usada   Tasa de cambio del día
 * @param {string} [data.observaciones]     Nota opcional
 * @param {Array}  data.productos           Lista de { id_producto, cantidad, costo_unitario_dolares }
 * @param {Array}  data.pagos               Lista de { id_cuenta_bancaria, monto_pagado_dolares }
 */
export const createPurchase = async ({
    id_usuario,
    id_proveedor,
    tasa_cambio_usada,
    observaciones,
    productos,
    pagos
}) => {
    if (!id_proveedor) throw new Error('El proveedor es obligatorio.');
    if (!tasa_cambio_usada || tasa_cambio_usada <= 0) throw new Error('La tasa de cambio es inválida.');
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        throw new Error('La compra debe incluir al menos un producto.');
    }
    if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
        throw new Error('La compra debe incluir al menos un método de pago.');
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Calcular totales y validar productos
        let totalCompraDolares = 0;
        for (const p of productos) {
            if (!p.id_producto || !p.cantidad || p.cantidad <= 0 || p.costo_unitario_dolares < 0) {
                throw new Error('Datos de producto inválidos. Verifica ID, cantidad y costo.');
            }

            // Verificar existencia del producto
            const [prodCheck] = await connection.query('SELECT id, nombre, stock_actual FROM productos WHERE id = ?', [p.id_producto]);
            if (prodCheck.length === 0) {
                throw new Error(`El producto con ID ${p.id_producto} no existe.`);
            }

            totalCompraDolares += (parseFloat(p.costo_unitario_dolares) * parseInt(p.cantidad, 10));
        }

        // 2. Calcular total en bolívares
        const totalCompraBolivares = totalCompraDolares * parseFloat(tasa_cambio_usada);

        // 3. Validar pagos
        let totalPagadoDolares = 0;
        for (const pago of pagos) {
            if (!pago.id_cuenta_bancaria || pago.monto_pagado_dolares <= 0) {
                throw new Error('Datos de pago inválidos. Verifica la cuenta bancaria y el monto.');
            }

            // Verificar cuenta y saldo
            const [cuentaCheck] = await connection.query('SELECT id, nombre_cuenta, saldo_actual, moneda FROM cuentas_bancarias WHERE id = ? FOR UPDATE', [pago.id_cuenta_bancaria]);
            if (cuentaCheck.length === 0) {
                throw new Error(`La cuenta bancaria con ID ${pago.id_cuenta_bancaria} no existe.`);
            }
            const cuenta = cuentaCheck[0];

            let monto_apagar_segun_moneda = parseFloat(pago.monto_pagado_dolares);

            // Si la cuenta es en VES, convertimos el monto en dólares a bolívares al momento de descontar
            if (cuenta.moneda === 'VES') {
                monto_apagar_segun_moneda = parseFloat(pago.monto_pagado_dolares) * parseFloat(tasa_cambio_usada);
            }

            if (parseFloat(cuenta.saldo_actual) < monto_apagar_segun_moneda) {
                throw new Error(`Saldo insuficiente en la cuenta '${cuenta.nombre_cuenta}'. Requiere ${monto_apagar_segun_moneda.toFixed(2)} ${cuenta.moneda}, pero tiene ${cuenta.saldo_actual}.`);
            }

            totalPagadoDolares += parseFloat(pago.monto_pagado_dolares);
        }

        // Permitimos un margen de error por redondeo de centavos (0.01)
        if (Math.abs(totalCompraDolares - totalPagadoDolares) > 0.05) {
            throw new Error(`El total de pagos ($${totalPagadoDolares.toFixed(2)}) no coincide con el total de la compra ($${totalCompraDolares.toFixed(2)}).`);
        }

        // 4. Insertar la Compra
        const obs = observaciones?.trim() || null;
        const [compraResult] = await connection.query(
            `INSERT INTO compras (id_proveedor, id_usuario, total_compra_dolares, tasa_cambio_usada, total_compra_bolivares, observaciones) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id_proveedor, id_usuario, totalCompraDolares, tasa_cambio_usada, totalCompraBolivares, obs]
        );
        const compraId = compraResult.insertId;

        // 5. Insertar Detalles de Compra y Actualizar Stock/Costo en Productos
        for (const p of productos) {
            const qty = parseInt(p.cantidad, 10);
            const costo = parseFloat(p.costo_unitario_dolares);

            // Guardar detalle
            await connection.query(
                `INSERT INTO detalles_compras (id_compra, id_producto, cantidad, costo_unitario_al_comprar) 
                 VALUES (?, ?, ?, ?)`,
                [compraId, p.id_producto, qty, costo]
            );

            // Actualizar inventario (sumar stock, actualizar costo_dolares al último precio pagado)
            await connection.query(
                `UPDATE productos SET stock_actual = stock_actual + ?, costo_dolares = ? WHERE id = ?`,
                [qty, costo, p.id_producto]
            );
        }

        // 6. Insertar Pagos y Descontar Saldos Bancarios
        for (const pago of pagos) {
            // Obtenemos moneda de la cuenta para saber si descontar directo en USD o convertir a VES
            const [c] = await connection.query('SELECT moneda FROM cuentas_bancarias WHERE id = ?', [pago.id_cuenta_bancaria]);
            let descuentoMonedaReal = parseFloat(pago.monto_pagado_dolares);
            if (c[0].moneda === 'VES') {
                descuentoMonedaReal = parseFloat(pago.monto_pagado_dolares) * parseFloat(tasa_cambio_usada);
            }

            // Insertar pago en dólares (referencial) en pagos_compras
            await connection.query(
                `INSERT INTO pagos_compras (id_compra, id_cuenta_bancaria, monto_pagado) VALUES (?, ?, ?)`,
                [compraId, pago.id_cuenta_bancaria, pago.monto_pagado_dolares]
            );

            // Descontar saldo
            await connection.query(
                `UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - ? WHERE id = ?`,
                [descuentoMonedaReal, pago.id_cuenta_bancaria]
            );
        }

        await connection.commit();

        return {
            id: compraId,
            total_compra_dolares: totalCompraDolares.toFixed(2),
            total_compra_bolivares: totalCompraBolivares.toFixed(2),
            mensaje: 'Compra procesada exitosamente e inventario sumado.'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Lista el historial de compras.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=10]
 */
export const listPurchases = async ({ page = 1, limit = 10 } = {}) => {
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM compras');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s).`);
    }

    const query = `
        SELECT c.id, c.total_compra_dolares, c.total_compra_bolivares, c.tasa_cambio_usada, 
               c.fecha_compra, prov.razon_social AS proveedor, u.nombre AS usuario
        FROM compras c
        LEFT JOIN proveedores prov ON c.id_proveedor = prov.id
        LEFT JOIN usuarios u ON c.id_usuario = u.id
        ORDER BY c.fecha_compra DESC
        LIMIT ? OFFSET ?
    `;

    const [compras] = await pool.query(query, [limite, offset]);

    return {
        compras,
        paginacion: { total, pagina, limite, totalPaginas }
    };
};

/**
 * Obtiene los detalles completos de una compra específica.
 *
 * @param {number} id
 */
export const getPurchaseById = async (id) => {
    if (!id) throw new Error('Se requiere el ID de la compra.');

    // 1. Cabecera (INFO de la Compra)
    const [compras] = await pool.query(`
        SELECT c.*, prov.razon_social AS proveedor, u.nombre AS usuario
        FROM compras c
        LEFT JOIN proveedores prov ON c.id_proveedor = prov.id
        LEFT JOIN usuarios u ON c.id_usuario = u.id
        WHERE c.id = ?
    `, [id]);

    if (compras.length === 0) throw new Error('No se encontró la compra.');
    const compra = compras[0];

    // 2. Detalles (Productos)
    const [productos] = await pool.query(`
        SELECT dc.cantidad, dc.costo_unitario_al_comprar, p.nombre AS nombre_producto, p.codigo_barras
        FROM detalles_compras dc
        INNER JOIN productos p ON dc.id_producto = p.id
        WHERE dc.id_compra = ?
    `, [id]);

    // 3. Pagos
    const [pagos] = await pool.query(`
        SELECT pc.monto_pagado AS monto_dolares, cb.nombre_cuenta, cb.moneda
        FROM pagos_compras pc
        INNER JOIN cuentas_bancarias cb ON pc.id_cuenta_bancaria = cb.id
        WHERE pc.id_compra = ?
    `, [id]);

    return {
        compra,
        productos,
        pagos
    };
};
