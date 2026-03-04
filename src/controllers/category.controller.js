import pool from '../config/database.js';

/**
 * Crea una nueva categoría.
 *
 * @param {Object} data
 * @param {string} data.nombre       Nombre de la categoría (obligatorio, único)
 * @param {string} [data.descripcion] Descripción opcional
 * @returns {Promise<Object>} La categoría creada.
 */
export const createCategory = async ({ nombre, descripcion = null }) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la categoría es obligatorio.');
    }

    // Verificar duplicado
    const [existing] = await pool.query(
        'SELECT id FROM categorias WHERE nombre = ?',
        [nombre.trim()]
    );

    if (existing.length > 0) {
        throw new Error(`Ya existe una categoría con el nombre '${nombre.trim()}'.`);
    }

    const [result] = await pool.query(
        'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
        [nombre.trim(), descripcion?.trim() || null]
    );

    return {
        id: result.insertId,
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null
    };
};

/**
 * Lista categorías con paginación o todas de una vez.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]    Página actual
 * @param {number}  [params.limit=10]  Registros por página
 * @param {boolean} [params.all=false] Si true, devuelve todas sin paginación
 * @returns {Promise<Object>}
 */
export const listCategories = async ({ page = 1, limit = 10, all = false } = {}) => {
    // ─── Listar todas sin paginación ──────────────
    if (all) {
        const [categorias] = await pool.query(
            'SELECT id, nombre, descripcion FROM categorias ORDER BY nombre ASC'
        );
        return { categorias, total: categorias.length };
    }

    // ─── Listar con paginación ────────────────────
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM categorias');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s) disponible(s).`);
    }

    const [categorias] = await pool.query(
        `SELECT id, nombre, descripcion
         FROM categorias
         ORDER BY nombre ASC
         LIMIT ? OFFSET ?`,
        [limite, offset]
    );

    return {
        categorias,
        paginacion: {
            total,
            pagina,
            limite,
            totalPaginas
        }
    };
};

/**
 * Actualiza una categoría existente.
 *
 * @param {Object} data
 * @param {number} data.id           ID de la categoría
 * @param {string} [data.nombre]     Nuevo nombre
 * @param {string} [data.descripcion] Nueva descripción
 * @returns {Promise<Object>} La categoría actualizada.
 */
export const updateCategory = async ({ id, nombre, descripcion }) => {
    if (!id) {
        throw new Error('Se requiere el ID de la categoría.');
    }

    // Verificar que exista
    const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('La categoría no fue encontrada.');
    }

    const categoriaActual = rows[0];

    // Determinar valores finales (mantener el actual si no se envía uno nuevo)
    const nuevoNombre = nombre?.trim() || categoriaActual.nombre;
    const nuevaDescripcion = descripcion !== undefined ? (descripcion?.trim() || null) : categoriaActual.descripcion;

    // Verificar duplicado de nombre (excluyendo el registro actual)
    if (nuevoNombre !== categoriaActual.nombre) {
        const [duplicado] = await pool.query(
            'SELECT id FROM categorias WHERE nombre = ? AND id != ?',
            [nuevoNombre, id]
        );

        if (duplicado.length > 0) {
            throw new Error(`Ya existe otra categoría con el nombre '${nuevoNombre}'.`);
        }
    }

    await pool.query(
        'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
        [nuevoNombre, nuevaDescripcion, id]
    );

    return {
        id: Number(id),
        nombre: nuevoNombre,
        descripcion: nuevaDescripcion,
        anterior: {
            nombre: categoriaActual.nombre,
            descripcion: categoriaActual.descripcion
        }
    };
};

/**
 * Elimina una categoría de la base de datos.
 * Eliminación física (la tabla no tiene campo esta_activo).
 *
 * @param {number} id  ID de la categoría a eliminar
 * @returns {Promise<Object>} Confirmación con los datos eliminados.
 */
export const deleteCategory = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID de la categoría.');
    }

    // Verificar que exista
    const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('La categoría no fue encontrada.');
    }

    const categoriaEliminada = rows[0];

    // Verificar si tiene productos asociados
    const [productos] = await pool.query(
        'SELECT COUNT(*) AS total FROM productos WHERE id_categoria = ?',
        [id]
    );

    if (productos[0].total > 0) {
        throw new Error(
            `No se puede eliminar la categoría '${categoriaEliminada.nombre}' porque tiene ${productos[0].total} producto(s) asociado(s).`
        );
    }

    await pool.query('DELETE FROM categorias WHERE id = ?', [id]);

    return {
        id: Number(id),
        nombre: categoriaEliminada.nombre,
        mensaje: 'Categoría eliminada correctamente.'
    };
};
