import pool from '../config/database.js';

/**
 * Registra una nueva venta (Transaccional).
 * Actualiza inventario (resta stock) y suma saldos bancarios.
 *
 * @param {Object} data
 * @param {number} data.id_usuario          Usuario que registra (del token)
 * @param {number} data.tasa_cambio_usada   Tasa de cambio del día
 * @param {Array}  data.productos           Lista de { id_producto, cantidad, precio_unitario_dolares }
 * @param {Array}  data.pagos               Lista de { id_cuenta_bancaria, monto_pagado_dolares }
 */
export const createSale = async ({
    id_usuario,
    tasa_cambio_usada,
    productos,
    pagos
}) => {
    if (!tasa_cambio_usada || tasa_cambio_usada <= 0) throw new Error('La tasa de cambio es inválida.');
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        throw new Error('La venta debe incluir al menos un producto.');
    }
    if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
        throw new Error('La venta debe incluir al menos un método de pago.');
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Calcular totales y validar productos y stock
        let totalVentaDolares = 0;
        for (const p of productos) {
            if (!p.id_producto || !p.cantidad || p.cantidad <= 0 || p.precio_unitario_dolares < 0) {
                throw new Error('Datos de producto inválidos. Verifica ID, cantidad y precio.');
            }

            // Verificar existencia y stock del producto para bloquear en concurrencia
            const [prodCheck] = await connection.query('SELECT id, nombre, stock_actual FROM productos WHERE id = ? FOR UPDATE', [p.id_producto]);
            if (prodCheck.length === 0) {
                throw new Error(`El producto con ID ${p.id_producto} no existe.`);
            }

            const producto = prodCheck[0];
            if (producto.stock_actual < p.cantidad) {
                throw new Error(`Stock insuficiente para el producto '${producto.nombre}'. Disponible: ${producto.stock_actual}, Solicitado: ${p.cantidad}.`);
            }

            totalVentaDolares += (parseFloat(p.precio_unitario_dolares) * parseInt(p.cantidad, 10));
        }

        // 2. Calcular total en bolívares
        const totalVentaBolivares = totalVentaDolares * parseFloat(tasa_cambio_usada);

        // 3. Validar pagos
        let totalPagadoDolares = 0;
        for (const pago of pagos) {
            if (!pago.id_cuenta_bancaria || pago.monto_pagado_dolares <= 0) {
                throw new Error('Datos de pago inválidos. Verifica la cuenta bancaria y el monto.');
            }

            // Verificar cuenta bancaria
            const [cuentaCheck] = await connection.query('SELECT id, nombre_cuenta, moneda FROM cuentas_bancarias WHERE id = ?', [pago.id_cuenta_bancaria]);
            if (cuentaCheck.length === 0) {
                throw new Error(`La cuenta bancaria con ID ${pago.id_cuenta_bancaria} no existe.`);
            }

            totalPagadoDolares += parseFloat(pago.monto_pagado_dolares);
        }

        // Permitimos un margen de error por redondeo de centavos (0.05)
        if (Math.abs(totalVentaDolares - totalPagadoDolares) > 0.05) {
            throw new Error(`El total de pagos ($${totalPagadoDolares.toFixed(2)}) no coincide con el total de la venta ($${totalVentaDolares.toFixed(2)}).`);
        }

        // 4. Insertar la Venta
        const [ventaResult] = await connection.query(
            `INSERT INTO ventas (id_usuario, total_dolares, tasa_cambio_usada, total_bolivares) 
             VALUES (?, ?, ?, ?)`,
            [id_usuario, totalVentaDolares, tasa_cambio_usada, totalVentaBolivares]
        );
        const ventaId = ventaResult.insertId;

        // 5. Insertar Detalles de Venta y Descontar Stock en Productos
        for (const p of productos) {
            const qty = parseInt(p.cantidad, 10);
            const precio = parseFloat(p.precio_unitario_dolares);

            // Guardar detalle
            await connection.query(
                `INSERT INTO detalles_ventas (id_venta, id_producto, cantidad, precio_unitario_al_vender) 
                 VALUES (?, ?, ?, ?)`,
                [ventaId, p.id_producto, qty, precio]
            );

            // Actualizar inventario (restar stock)
            await connection.query(
                `UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?`,
                [qty, p.id_producto]
            );
        }

        // 6. Insertar Pagos y Sumar Saldos Bancarios
        for (const pago of pagos) {
            // Obtenemos moneda de la cuenta para saber si sumar directo en USD o convertir a VES
            const [c] = await connection.query('SELECT moneda FROM cuentas_bancarias WHERE id = ?', [pago.id_cuenta_bancaria]);
            let abonoMonedaReal = parseFloat(pago.monto_pagado_dolares);
            if (c[0].moneda === 'VES') {
                abonoMonedaReal = parseFloat(pago.monto_pagado_dolares) * parseFloat(tasa_cambio_usada);
            }

            // Insertar pago en dólares (referencial) en pagos_ventas
            await connection.query(
                `INSERT INTO pagos_ventas (id_venta, id_cuenta_bancaria, monto_pagado) VALUES (?, ?, ?)`,
                [ventaId, pago.id_cuenta_bancaria, pago.monto_pagado_dolares]
            );

            // Sumar saldo
            await connection.query(
                `UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + ? WHERE id = ?`,
                [abonoMonedaReal, pago.id_cuenta_bancaria]
            );
        }

        await connection.commit();

        return {
            id: ventaId,
            total_dolares: totalVentaDolares.toFixed(2),
            total_bolivares: totalVentaBolivares.toFixed(2),
            mensaje: 'Venta procesada exitosamente e inventario descontado.'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Lista el historial de ventas.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=10]
 */
export const listSales = async ({ page = 1, limit = 10 } = {}) => {
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM ventas');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s).`);
    }

    const query = `
        SELECT v.id, v.total_dolares, v.total_bolivares, v.tasa_cambio_usada, 
               v.fecha_venta, u.nombre_usuario AS usuario
        FROM ventas v
        LEFT JOIN usuarios u ON v.id_usuario = u.id
        ORDER BY v.fecha_venta DESC
        LIMIT ? OFFSET ?
    `;

    const [ventas] = await pool.query(query, [limite, offset]);

    return {
        ventas,
        paginacion: { total, pagina, limite, totalPaginas }
    };
};

/**
 * Obtiene los detalles completos de una venta específica.
 *
 * @param {number} id
 */
export const getSaleById = async (id) => {
    if (!id) throw new Error('Se requiere el ID de la venta.');

    // 1. Cabecera (INFO de la Venta)
    const [ventas] = await pool.query(`
        SELECT v.*, u.nombre_usuario AS usuario, u.nombre_completo AS usuario_nombre
        FROM ventas v
        LEFT JOIN usuarios u ON v.id_usuario = u.id
        WHERE v.id = ?
    `, [id]);

    if (ventas.length === 0) throw new Error('No se encontró la venta.');
    const venta = ventas[0];

    // 2. Detalles (Productos)
    const [productos] = await pool.query(`
        SELECT dv.cantidad, dv.precio_unitario_al_vender, p.nombre AS nombre_producto, p.codigo_barras
        FROM detalles_ventas dv
        INNER JOIN productos p ON dv.id_producto = p.id
        WHERE dv.id_venta = ?
    `, [id]);

    // 3. Pagos
    const [pagos] = await pool.query(`
        SELECT pv.monto_pagado AS monto_dolares, cb.nombre_cuenta, cb.moneda
        FROM pagos_ventas pv
        INNER JOIN cuentas_bancarias cb ON pv.id_cuenta_bancaria = cb.id
        WHERE pv.id_venta = ?
    `, [id]);

    return {
        venta,
        productos,
        pagos
    };
};
