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
