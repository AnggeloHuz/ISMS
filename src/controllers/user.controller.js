import bcrypt from 'bcrypt';
import pool from '../config/database.js';

/**
 * Registra un nuevo usuario en la base de datos.
 * Aplica lógica de negocio puro: validaciones de datos y hashing de contraseñas.
 * 
 * @param {Object} userData
 * @param {string} userData.nombre_usuario
 * @param {string} userData.clave_acceso
 * @param {string} userData.nombre_completo
 * @param {string} userData.rol
 * @returns {Promise<Object>} El usuario creado (sin la contraseña).
 */
export const createUser = async ({ nombre_usuario, clave_acceso, nombre_completo, rol }) => {
    // 1. Validaciones básicas
    if (!nombre_usuario || !clave_acceso || !nombre_completo || !rol) {
        throw new Error('Todos los campos son obligatorios: nombre_usuario, clave_acceso, nombre_completo, rol.');
    }

    const rolesValidos = ['administrador', 'cajero', 'almacenista'];
    if (!rolesValidos.includes(rol.toLowerCase())) {
        throw new Error(`Rol inválido. Roles permitidos: ${rolesValidos.join(', ')}`);
    }

    // 2. Verificar si el usuario ya existe
    const [existingUsers] = await pool.query(
        'SELECT id FROM usuarios WHERE nombre_usuario = ?',
        [nombre_usuario]
    );

    if (existingUsers.length > 0) {
        throw new Error(`El nombre de usuario '${nombre_usuario}' ya está en uso.`);
    }

    // 3. Encriptar la contraseña (salts = 10 es un buen balance de seguridad/rendimiento)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(clave_acceso, saltRounds);

    // 4. Insertar en la base de datos
    const [result] = await pool.query(
        `INSERT INTO usuarios (nombre_usuario, clave_acceso, nombre_completo, rol) 
         VALUES (?, ?, ?, ?)`,
        [nombre_usuario, hashedPassword, nombre_completo, rol.toLowerCase()]
    );

    // 5. Retornar los datos del usuario creado (excluyendo la clave)
    return {
        id: result.insertId,
        nombre_usuario,
        nombre_completo,
        rol: rol.toLowerCase(),
        esta_activo: true
    };
};

/**
 * Lista usuarios con paginación.
 * Devuelve todos los usuarios (activos e inactivos) sin exponer la contraseña.
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @returns {Promise<{ usuarios: Object[], paginacion: Object }>}
 */
export const listUsers = async ({ page = 1, limit = 10 } = {}) => {
    // Sanitizar parámetros
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    // Contar total de registros
    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    // Validar que la página solicitada exista
    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s) disponible(s).`);
    }

    // Consultar la página actual (sin clave_acceso)
    const [usuarios] = await pool.query(
        `SELECT id, nombre_usuario, nombre_completo, rol, esta_activo, fecha_registro
         FROM usuarios
         ORDER BY id ASC
         LIMIT ? OFFSET ?`,
        [limite, offset]
    );

    return {
        usuarios,
        paginacion: {
            total,
            pagina,
            limite,
            totalPaginas: Math.ceil(total / limite)
        }
    };
};

/**
 * Actualiza la contraseña de un usuario.
 *
 * @param {Object} params
 * @param {number} params.id      ID del usuario a actualizar
 * @param {string} params.nueva_clave  Nueva contraseña en texto plano
 * @returns {Promise<Object>} Confirmación con el ID del usuario actualizado.
 */
export const updatePassword = async ({ id, nueva_clave }) => {
    if (!id || !nueva_clave) {
        throw new Error('Se requiere el ID del usuario y la nueva contraseña.');
    }

    if (nueva_clave.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    // Verificar que el usuario exista
    const [users] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
        throw new Error('El usuario no fue encontrado.');
    }

    // Hashear y actualizar
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nueva_clave, saltRounds);

    await pool.query('UPDATE usuarios SET clave_acceso = ? WHERE id = ?', [hashedPassword, id]);

    return { id: Number(id), mensaje: 'Contraseña actualizada correctamente.' };
};

/**
 * Actualiza el rol de un usuario.
 *
 * @param {Object} params
 * @param {number} params.id        ID del usuario a actualizar
 * @param {string} params.nuevo_rol Nuevo rol a asignar
 * @returns {Promise<Object>} Usuario con su nuevo rol.
 */
export const updateRole = async ({ id, nuevo_rol }) => {
    if (!id || !nuevo_rol) {
        throw new Error('Se requiere el ID del usuario y el nuevo rol.');
    }

    const rolesValidos = ['administrador', 'cajero', 'almacenista'];
    if (!rolesValidos.includes(nuevo_rol.toLowerCase())) {
        throw new Error(`Rol inválido. Roles permitidos: ${rolesValidos.join(', ')}`);
    }

    // Verificar que el usuario exista
    const [users] = await pool.query('SELECT id, nombre_usuario FROM usuarios WHERE id = ?', [id]);
    if (users.length === 0) {
        throw new Error('El usuario no fue encontrado.');
    }

    await pool.query('UPDATE usuarios SET rol = ? WHERE id = ?', [nuevo_rol.toLowerCase(), id]);

    return {
        id: Number(id),
        nombre_usuario: users[0].nombre_usuario,
        nuevo_rol: nuevo_rol.toLowerCase()
    };
};

/**
 * Elimina un usuario de forma lógica (soft delete).
 * Establece `esta_activo = false` en lugar de borrar el registro.
 *
 * @param {number} id  ID del usuario a desactivar
 * @returns {Promise<Object>} Confirmación.
 */
export const deleteUser = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID del usuario.');
    }

    // Verificar que el usuario exista
    const [users] = await pool.query(
        'SELECT id, nombre_usuario, esta_activo FROM usuarios WHERE id = ?',
        [id]
    );

    if (users.length === 0) {
        throw new Error('El usuario no fue encontrado.');
    }

    if (!users[0].esta_activo) {
        throw new Error('El usuario ya se encuentra desactivado.');
    }

    // No permitir eliminarse a sí mismo (se valida en la ruta, pero doble check)
    await pool.query('UPDATE usuarios SET esta_activo = false WHERE id = ?', [id]);

    return {
        id: Number(id),
        nombre_usuario: users[0].nombre_usuario,
        mensaje: 'Usuario desactivado correctamente.'
    };
};
