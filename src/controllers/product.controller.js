import pool from '../config/database.js';

/**
 * Crea un nuevo producto.
 *
 * @param {Object} data
 * @param {string} [data.codigo_barras]   Código de barras (opcional, debe ser único si existe)
 * @param {string} data.nombre            Nombre del producto (obligatorio)
 * @param {number} [data.id_categoria]    Categoría a la que pertenece (opcional)
 * @param {number} [data.costo_dolares]   Costo (default 0)
 * @param {number} [data.precio_dolares]  Precio de venta (default 0)
 * @param {number} [data.stock_actual]    Stock inicial (default 0)
 * @param {number} [data.stock_minimo]    Stock mínimo alerta (default 5)
 * @returns {Promise<Object>} El producto creado.
 */
export const createProduct = async ({
    codigo_barras,
    nombre,
    id_categoria,
    costo_dolares,
    precio_dolares,
    stock_actual,
    stock_minimo
}) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre del producto es obligatorio.');
    }

    // Verificar código de barras duplicado
    if (codigo_barras && codigo_barras.trim() !== '') {
        const [existingCode] = await pool.query(
            'SELECT id FROM productos WHERE codigo_barras = ?',
            [codigo_barras.trim()]
        );
        if (existingCode.length > 0) {
            throw new Error(`Ya existe un producto con el código de barras '${codigo_barras.trim()}'.`);
        }
    }

    // Verificar que la categoría exista
    let categoriaValida = null;
    if (id_categoria) {
        const [cat] = await pool.query('SELECT id FROM categorias WHERE id = ?', [id_categoria]);
        if (cat.length === 0) {
            throw new Error(`La categoría con ID ${id_categoria} no existe.`);
        }
        categoriaValida = id_categoria;
    }

    const costo = parseFloat(costo_dolares) || 0;
    const precio = parseFloat(precio_dolares) || 0;
    const stock = parseInt(stock_actual, 10) || 0;
    const minimo = stock_minimo !== undefined ? parseInt(stock_minimo, 10) : 5;
    const codigo = codigo_barras?.trim() || null;

    const [result] = await pool.query(
        `INSERT INTO productos 
         (codigo_barras, nombre, id_categoria, costo_dolares, precio_dolares, stock_actual, stock_minimo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [codigo, nombre.trim(), categoriaValida, costo, precio, stock, minimo]
    );

    return {
        id: result.insertId,
        codigo_barras: codigo,
        nombre: nombre.trim(),
        id_categoria: categoriaValida,
        costo_dolares: costo,
        precio_dolares: precio,
        stock_actual: stock,
        stock_minimo: minimo,
        esta_activo: true
    };
};

/**
 * Lista productos con paginación o todos de una vez.
 * Hace JOIN con categorias para obtener el nombre de la categoría.
 *
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=10]
 * @param {boolean} [params.all=false]
 * @returns {Promise<Object>}
 */
export const listProducts = async ({ page = 1, limit = 10, all = false } = {}) => {
    const querySelect = `
        SELECT 
            p.id, p.codigo_barras, p.nombre, p.id_categoria, 
            c.nombre AS nombre_categoria,
            p.costo_dolares, p.precio_dolares, p.stock_actual, 
            p.stock_minimo, p.esta_activo
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id
    `;

    if (all) {
        const [productos] = await pool.query(`${querySelect} ORDER BY p.nombre ASC`);
        return { productos, total: productos.length };
    }

    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM productos');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s) disponible(s).`);
    }

    const [productos] = await pool.query(
        `${querySelect} ORDER BY p.nombre ASC LIMIT ? OFFSET ?`,
        [limite, offset]
    );

    return {
        productos,
        paginacion: { total, pagina, limite, totalPaginas }
    };
};

/**
 * Actualiza un producto existente.
 *
 * @param {Object} data
 * @param {number} data.id
 * @param {string} [data.codigo_barras]
 * @param {string} [data.nombre]
 * @param {number} [data.id_categoria]
 * @param {number} [data.costo_dolares]
 * @param {number} [data.precio_dolares]
 * @param {number} [data.stock_actual]
 * @param {number} [data.stock_minimo]
 * @param {boolean} [data.esta_activo]
 * @returns {Promise<Object>}
 */
export const updateProduct = async ({
    id, codigo_barras, nombre, id_categoria, costo_dolares,
    precio_dolares, stock_actual, stock_minimo, esta_activo
}) => {
    if (!id) {
        throw new Error('Se requiere el ID del producto.');
    }

    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('El producto no fue encontrado.');
    }

    const actual = rows[0];

    // Procesar valores
    const nuevoCodigo = codigo_barras !== undefined ? (codigo_barras?.trim() || null) : actual.codigo_barras;
    const nuevoNombre = nombre?.trim() || actual.nombre;
    const nuevaCategoria = id_categoria !== undefined ? (parseInt(id_categoria, 10) || null) : actual.id_categoria;
    const nuevoCosto = costo_dolares !== undefined ? parseFloat(costo_dolares) : actual.costo_dolares;
    const nuevoPrecio = precio_dolares !== undefined ? parseFloat(precio_dolares) : actual.precio_dolares;
    const nuevoStock = stock_actual !== undefined ? parseInt(stock_actual, 10) : actual.stock_actual;
    const nuevoMinimo = stock_minimo !== undefined ? parseInt(stock_minimo, 10) : actual.stock_minimo;
    const nuevoActivo = esta_activo !== undefined ? Boolean(esta_activo) : actual.esta_activo;

    // Verificar duplicidad de código de barras (excluyendo el actual)
    if (nuevoCodigo && nuevoCodigo !== actual.codigo_barras) {
        const [duplicado] = await pool.query(
            'SELECT id FROM productos WHERE codigo_barras = ? AND id != ?',
            [nuevoCodigo, id]
        );
        if (duplicado.length > 0) {
            throw new Error(`Ya existe otro producto con el código de barras '${nuevoCodigo}'.`);
        }
    }

    // Verificar categoría si cambió
    if (nuevaCategoria && nuevaCategoria !== actual.id_categoria) {
        const [cat] = await pool.query('SELECT id FROM categorias WHERE id = ?', [nuevaCategoria]);
        if (cat.length === 0) {
            throw new Error(`La categoría con ID ${nuevaCategoria} no existe.`);
        }
    }

    await pool.query(
        `UPDATE productos 
         SET codigo_barras = ?, nombre = ?, id_categoria = ?, costo_dolares = ?, 
             precio_dolares = ?, stock_actual = ?, stock_minimo = ?, esta_activo = ?
         WHERE id = ?`,
        [nuevoCodigo, nuevoNombre, nuevaCategoria, nuevoCosto, nuevoPrecio, nuevoStock, nuevoMinimo, nuevoActivo, id]
    );

    return {
        id: Number(id),
        codigo_barras: nuevoCodigo,
        nombre: nuevoNombre,
        id_categoria: nuevaCategoria,
        costo_dolares: nuevoCosto,
        precio_dolares: nuevoPrecio,
        stock_actual: nuevoStock,
        stock_minimo: nuevoMinimo,
        esta_activo: nuevoActivo,
        anterior: actual
    };
};

/**
 * Elimina un producto.
 * Si el producto tiene historial en compras o ventas, bloquea el borrado
 * indicando que debe desactivarse en su lugar.
 *
 * @param {number} id
 * @returns {Promise<Object>}
 */
export const deleteProduct = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID del producto.');
    }

    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (rows.length === 0) {
        throw new Error('El producto no fue encontrado.');
    }
    const producto = rows[0];

    // Verificar dependencias en compras
    const [compras] = await pool.query('SELECT COUNT(*) AS total FROM detalles_compras WHERE id_producto = ?', [id]);
    if (compras[0].total > 0) {
        throw new Error(`No se puede eliminar el producto '${producto.nombre}' porque está registrado en ${compras[0].total} compra(s). Por favor, desactívelo en su lugar.`);
    }

    // Verificar dependencias en ventas
    const [ventas] = await pool.query('SELECT COUNT(*) AS total FROM detalles_ventas WHERE id_producto = ?', [id]);
    if (ventas[0].total > 0) {
        throw new Error(`No se puede eliminar el producto '${producto.nombre}' porque está registrado en ${ventas[0].total} venta(s). Por favor, desactívelo en su lugar.`);
    }

    await pool.query('DELETE FROM productos WHERE id = ?', [id]);

    return {
        id: Number(id),
        nombre: producto.nombre,
        mensaje: 'Producto eliminado correctamente.'
    };
};
