import pool from '../config/database.js';

/**
 * Crea una nueva configuración.
 *
 * @param {Object} data
 * @param {string} data.clave_configuracion Clave (obligatorio, único)
 * @param {string} data.valor_configuracion Valor (obligatorio)
 * @returns {Promise<Object>} La configuración creada.
 */
export const createConfiguration = async ({ clave_configuracion, valor_configuracion }) => {
    if (!clave_configuracion || !clave_configuracion.trim()) {
        throw new Error('La clave de la configuración es obligatoria.');
    }

    if (valor_configuracion === undefined || valor_configuracion === null) {
        throw new Error('El valor de la configuración es obligatorio.');
    }

    const clave = clave_configuracion.trim();
    const valor = String(valor_configuracion).trim();

    // Verificar duplicado
    const [existing] = await pool.query(
        'SELECT clave_configuracion FROM configuraciones WHERE clave_configuracion = ?',
        [clave]
    );

    if (existing.length > 0) {
        throw new Error(`Ya existe una configuración con la clave '${clave}'.`);
    }

    await pool.query(
        'INSERT INTO configuraciones (clave_configuracion, valor_configuracion) VALUES (?, ?)',
        [clave, valor]
    );

    return {
        clave_configuracion: clave,
        valor_configuracion: valor
    };
};

/**
 * Lista configuraciones con paginación o todas de una vez.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]    Página actual
 * @param {number}  [params.limit=10]  Registros por página
 * @param {boolean} [params.all=false] Si true, devuelve todas sin paginación
 * @returns {Promise<Object>}
 */
export const listConfigurations = async ({ page = 1, limit = 10, all = false } = {}) => {
    // ─── Listar todas sin paginación ──────────────
    if (all) {
        const [configuraciones] = await pool.query(
            'SELECT clave_configuracion, valor_configuracion, fecha_actualizacion FROM configuraciones ORDER BY clave_configuracion ASC'
        );
        return { configuraciones, total: configuraciones.length };
    }

    // ─── Listar con paginación ────────────────────
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM configuraciones');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s) disponible(s).`);
    }

    const [configuraciones] = await pool.query(
        `SELECT clave_configuracion, valor_configuracion, fecha_actualizacion
         FROM configuraciones
         ORDER BY clave_configuracion ASC
         LIMIT ? OFFSET ?`,
        [limite, offset]
    );

    return {
        configuraciones,
        paginacion: {
            total,
            pagina,
            limite,
            totalPaginas
        }
    };
};

/**
 * Actualiza una configuración existente.
 *
 * @param {Object} data
 * @param {string} data.clave_configuracion Clave de la configuración
 * @param {string} data.valor_configuracion Nuevo valor
 * @returns {Promise<Object>} La configuración actualizada.
 */
export const updateConfiguration = async ({ clave_configuracion, valor_configuracion }) => {
    if (!clave_configuracion) {
        throw new Error('Se requiere la clave de la configuración.');
    }

    if (valor_configuracion === undefined || valor_configuracion === null) {
        throw new Error('El valor de la configuración es obligatorio para actualizar.');
    }

    // Verificar que exista
    const [rows] = await pool.query('SELECT * FROM configuraciones WHERE clave_configuracion = ?', [clave_configuracion]);
    if (rows.length === 0) {
        throw new Error('La configuración no fue encontrada.');
    }

    const configuracionActual = rows[0];
    const nuevoValor = String(valor_configuracion).trim();

    await pool.query(
        'UPDATE configuraciones SET valor_configuracion = ? WHERE clave_configuracion = ?',
        [nuevoValor, clave_configuracion]
    );

    return {
        clave_configuracion,
        valor_configuracion: nuevoValor,
        anterior: {
            valor_configuracion: configuracionActual.valor_configuracion
        }
    };
};

/**
 * Elimina una configuración de la base de datos.
 *
 * @param {string} clave_configuracion Clave a eliminar
 * @returns {Promise<Object>} Confirmación.
 */
export const deleteConfiguration = async (clave_configuracion) => {
    if (!clave_configuracion) {
        throw new Error('Se requiere la clave de la configuración.');
    }

    // Verificar que exista
    const [rows] = await pool.query('SELECT * FROM configuraciones WHERE clave_configuracion = ?', [clave_configuracion]);
    if (rows.length === 0) {
        throw new Error('La configuración no fue encontrada.');
    }

    const configuracionEliminada = rows[0];

    await pool.query('DELETE FROM configuraciones WHERE clave_configuracion = ?', [clave_configuracion]);

    return {
        clave_configuracion,
        valor_configuracion: configuracionEliminada.valor_configuracion,
        mensaje: 'Configuración eliminada correctamente.'
    };
};
