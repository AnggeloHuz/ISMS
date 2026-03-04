import pool from '../config/database.js';

/**
 * Registra una nueva cuenta bancaria.
 *
 * @param {Object} data
 * @param {string} data.nombre_cuenta  Nombre descriptivo de la cuenta (obligatorio)
 * @param {string} data.moneda         'USD' o 'VES' (obligatorio)
 * @param {number} [data.saldo_actual] Saldo inicial (default 0)
 * @returns {Promise<Object>} La cuenta creada.
 */
export const createBankAccount = async ({ nombre_cuenta, moneda, saldo_actual = 0 }) => {
    if (!nombre_cuenta || !nombre_cuenta.trim()) {
        throw new Error('El nombre de la cuenta es obligatorio.');
    }

    if (!moneda) {
        throw new Error('La moneda es obligatoria.');
    }

    const monedasValidas = ['USD', 'VES'];
    if (!monedasValidas.includes(moneda.toUpperCase())) {
        throw new Error(`Moneda inválida. Monedas permitidas: ${monedasValidas.join(', ')}`);
    }

    // Verificar duplicado por nombre
    const [existing] = await pool.query(
        'SELECT id FROM cuentas_bancarias WHERE nombre_cuenta = ?',
        [nombre_cuenta.trim()]
    );

    if (existing.length > 0) {
        throw new Error(`Ya existe una cuenta bancaria con el nombre '${nombre_cuenta.trim()}'.`);
    }

    const saldo = parseFloat(saldo_actual) || 0;

    const [result] = await pool.query(
        'INSERT INTO cuentas_bancarias (nombre_cuenta, moneda, saldo_actual) VALUES (?, ?, ?)',
        [nombre_cuenta.trim(), moneda.toUpperCase(), saldo]
    );

    return {
        id: result.insertId,
        nombre_cuenta: nombre_cuenta.trim(),
        moneda: moneda.toUpperCase(),
        saldo_actual: saldo,
        esta_activa: true
    };
};

/**
 * Lista cuentas bancarias con paginación o todas de una vez.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=10]
 * @param {boolean} [params.all=false]
 * @returns {Promise<Object>}
 */
export const listBankAccounts = async ({ page = 1, limit = 10, all = false } = {}) => {
    if (all) {
        const [cuentas] = await pool.query(
            'SELECT id, nombre_cuenta, moneda, saldo_actual, esta_activa FROM cuentas_bancarias ORDER BY nombre_cuenta ASC'
        );
        return { cuentas, total: cuentas.length };
    }

    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM cuentas_bancarias');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s) disponible(s).`);
    }

    const [cuentas] = await pool.query(
        `SELECT id, nombre_cuenta, moneda, saldo_actual, esta_activa
         FROM cuentas_bancarias
         ORDER BY nombre_cuenta ASC
         LIMIT ? OFFSET ?`,
        [limite, offset]
    );

    return {
        cuentas,
        paginacion: { total, pagina, limite, totalPaginas }
    };
};

/**
 * Actualiza una cuenta bancaria existente.
 *
 * @param {Object} data
 * @param {number} data.id
 * @param {string} [data.nombre_cuenta]
 * @param {string} [data.moneda]
 * @param {boolean} [data.esta_activa]
 * @returns {Promise<Object>} La cuenta actualizada.
 */
export const updateBankAccount = async ({ id, nombre_cuenta, moneda, esta_activa }) => {
    if (!id) {
        throw new Error('Se requiere el ID de la cuenta bancaria.');
    }

    const [rows] = await pool.query('SELECT * FROM cuentas_bancarias WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('La cuenta bancaria no fue encontrada.');
    }

    const actual = rows[0];

    const nuevoNombre = nombre_cuenta?.trim() || actual.nombre_cuenta;
    const nuevaMoneda = moneda ? moneda.toUpperCase() : actual.moneda;
    const nuevaActiva = esta_activa !== undefined ? Boolean(esta_activa) : actual.esta_activa;

    // Validar moneda
    if (moneda) {
        const monedasValidas = ['USD', 'VES'];
        if (!monedasValidas.includes(nuevaMoneda)) {
            throw new Error(`Moneda inválida. Monedas permitidas: ${monedasValidas.join(', ')}`);
        }
    }

    // Verificar duplicado de nombre (excluyendo el registro actual)
    if (nuevoNombre !== actual.nombre_cuenta) {
        const [duplicado] = await pool.query(
            'SELECT id FROM cuentas_bancarias WHERE nombre_cuenta = ? AND id != ?',
            [nuevoNombre, id]
        );

        if (duplicado.length > 0) {
            throw new Error(`Ya existe otra cuenta bancaria con el nombre '${nuevoNombre}'.`);
        }
    }

    await pool.query(
        'UPDATE cuentas_bancarias SET nombre_cuenta = ?, moneda = ?, esta_activa = ? WHERE id = ?',
        [nuevoNombre, nuevaMoneda, nuevaActiva, id]
    );

    return {
        id: Number(id),
        nombre_cuenta: nuevoNombre,
        moneda: nuevaMoneda,
        saldo_actual: actual.saldo_actual,
        esta_activa: nuevaActiva,
        anterior: {
            nombre_cuenta: actual.nombre_cuenta,
            moneda: actual.moneda,
            esta_activa: Boolean(actual.esta_activa)
        }
    };
};

/**
 * Elimina una cuenta bancaria.
 * No permite eliminar si tiene pagos asociados.
 *
 * @param {number} id
 * @returns {Promise<Object>}
 */
export const deleteBankAccount = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID de la cuenta bancaria.');
    }

    const [rows] = await pool.query('SELECT * FROM cuentas_bancarias WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('La cuenta bancaria no fue encontrada.');
    }

    const cuenta = rows[0];

    // Verificar si tiene pagos asociados
    const [pagos] = await pool.query(
        'SELECT COUNT(*) AS total FROM pagos_ventas WHERE id_cuenta_bancaria = ?',
        [id]
    );

    if (pagos[0].total > 0) {
        throw new Error(
            `No se puede eliminar la cuenta '${cuenta.nombre_cuenta}' porque tiene ${pagos[0].total} pago(s) asociado(s).`
        );
    }

    await pool.query('DELETE FROM cuentas_bancarias WHERE id = ?', [id]);

    return {
        id: Number(id),
        nombre_cuenta: cuenta.nombre_cuenta,
        mensaje: 'Cuenta bancaria eliminada correctamente.'
    };
};
