import pool from '../config/database.js';

/**
 * Crea un nuevo proveedor.
 *
 * @param {Object} data
 * @param {string} data.rif             RIF del proveedor (obligatorio, único)
 * @param {string} data.razon_social    Razón social (obligatorio)
 * @param {string} [data.nombre_contacto] Nombre de contacto
 * @param {string} [data.telefono]      Teléfono
 * @param {string} [data.direccion]     Dirección
 * @returns {Promise<Object>} El proveedor creado.
 */
export const createSupplier = async ({ rif, razon_social, nombre_contacto = null, telefono = null, direccion = null }) => {
    if (!rif || !rif.trim()) {
        throw new Error('El RIF del proveedor es obligatorio.');
    }

    if (!razon_social || !razon_social.trim()) {
        throw new Error('La razón social del proveedor es obligatoria.');
    }

    // Verificar duplicado por RIF
    const [existing] = await pool.query(
        'SELECT id FROM proveedores WHERE rif = ?',
        [rif.trim()]
    );

    if (existing.length > 0) {
        throw new Error(`Ya existe un proveedor con el RIF '${rif.trim()}'.`);
    }

    const [result] = await pool.query(
        `INSERT INTO proveedores (rif, razon_social, nombre_contacto, telefono, direccion)
         VALUES (?, ?, ?, ?, ?)`,
        [
            rif.trim(),
            razon_social.trim(),
            nombre_contacto?.trim() || null,
            telefono?.trim() || null,
            direccion?.trim() || null
        ]
    );

    return {
        id: result.insertId,
        rif: rif.trim(),
        razon_social: razon_social.trim(),
        nombre_contacto: nombre_contacto?.trim() || null,
        telefono: telefono?.trim() || null,
        direccion: direccion?.trim() || null
    };
};

/**
 * Lista proveedores con paginación o todos de una vez.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=10]
 * @param {boolean} [params.all=false] Si true, devuelve todos sin paginación
 * @returns {Promise<Object>}
 */
export const listSuppliers = async ({ page = 1, limit = 10, all = false } = {}) => {
    // ─── Listar todos sin paginación ──────────────
    if (all) {
        const [proveedores] = await pool.query(
            `SELECT id, rif, razon_social, nombre_contacto, telefono, direccion, fecha_registro
             FROM proveedores
             ORDER BY razon_social ASC`
        );
        return { proveedores, total: proveedores.length };
    }

    // ─── Listar con paginación ────────────────────
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM proveedores');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s) disponible(s).`);
    }

    const [proveedores] = await pool.query(
        `SELECT id, rif, razon_social, nombre_contacto, telefono, direccion, fecha_registro
         FROM proveedores
         ORDER BY razon_social ASC
         LIMIT ? OFFSET ?`,
        [limite, offset]
    );

    return {
        proveedores,
        paginacion: {
            total,
            pagina,
            limite,
            totalPaginas
        }
    };
};

/**
 * Actualiza un proveedor existente.
 *
 * @param {Object} data
 * @param {number} data.id
 * @param {string} [data.rif]
 * @param {string} [data.razon_social]
 * @param {string} [data.nombre_contacto]
 * @param {string} [data.telefono]
 * @param {string} [data.direccion]
 * @returns {Promise<Object>} El proveedor actualizado.
 */
export const updateSupplier = async ({ id, rif, razon_social, nombre_contacto, telefono, direccion }) => {
    if (!id) {
        throw new Error('Se requiere el ID del proveedor.');
    }

    // Verificar que exista
    const [rows] = await pool.query('SELECT * FROM proveedores WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('El proveedor no fue encontrado.');
    }

    const actual = rows[0];

    // Determinar valores finales
    const nuevoRif = rif?.trim() || actual.rif;
    const nuevaRazon = razon_social?.trim() || actual.razon_social;
    const nuevoContacto = nombre_contacto !== undefined ? (nombre_contacto?.trim() || null) : actual.nombre_contacto;
    const nuevoTelefono = telefono !== undefined ? (telefono?.trim() || null) : actual.telefono;
    const nuevaDireccion = direccion !== undefined ? (direccion?.trim() || null) : actual.direccion;

    // Verificar duplicado de RIF (excluyendo el registro actual)
    if (nuevoRif !== actual.rif) {
        const [duplicado] = await pool.query(
            'SELECT id FROM proveedores WHERE rif = ? AND id != ?',
            [nuevoRif, id]
        );

        if (duplicado.length > 0) {
            throw new Error(`Ya existe otro proveedor con el RIF '${nuevoRif}'.`);
        }
    }

    await pool.query(
        `UPDATE proveedores
         SET rif = ?, razon_social = ?, nombre_contacto = ?, telefono = ?, direccion = ?
         WHERE id = ?`,
        [nuevoRif, nuevaRazon, nuevoContacto, nuevoTelefono, nuevaDireccion, id]
    );

    return {
        id: Number(id),
        rif: nuevoRif,
        razon_social: nuevaRazon,
        nombre_contacto: nuevoContacto,
        telefono: nuevoTelefono,
        direccion: nuevaDireccion,
        anterior: {
            rif: actual.rif,
            razon_social: actual.razon_social,
            nombre_contacto: actual.nombre_contacto,
            telefono: actual.telefono,
            direccion: actual.direccion
        }
    };
};

/**
 * Elimina un proveedor de la base de datos.
 * No permite eliminar si tiene compras asociadas.
 *
 * @param {number} id  ID del proveedor a eliminar
 * @returns {Promise<Object>} Confirmación con los datos eliminados.
 */
export const deleteSupplier = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID del proveedor.');
    }

    // Verificar que exista
    const [rows] = await pool.query('SELECT * FROM proveedores WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('El proveedor no fue encontrado.');
    }

    const proveedor = rows[0];

    // Verificar si tiene compras asociadas
    const [compras] = await pool.query(
        'SELECT COUNT(*) AS total FROM compras WHERE id_proveedor = ?',
        [id]
    );

    if (compras[0].total > 0) {
        throw new Error(
            `No se puede eliminar el proveedor '${proveedor.razon_social}' porque tiene ${compras[0].total} compra(s) asociada(s).`
        );
    }

    await pool.query('DELETE FROM proveedores WHERE id = ?', [id]);

    return {
        id: Number(id),
        rif: proveedor.rif,
        razon_social: proveedor.razon_social,
        mensaje: 'Proveedor eliminado correctamente.'
    };
};
