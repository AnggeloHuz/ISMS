import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import env from '../config/env.js';

/**
 * Valida las credenciales del usuario y genera un token JWT.
 * Lanza un error si las credenciales son inválidas o faltan datos.
 * 
 * @param {Object} credentials
 * @param {string} credentials.nombre_usuario
 * @param {string} credentials.clave_acceso
 * @returns {Promise<{ token: string, cookieOptions: Object, usuario: Object }>}
 */
export const login = async ({ nombre_usuario, clave_acceso }) => {
    // 1. Validar que vengan los datos
    if (!nombre_usuario || !clave_acceso) {
        throw new Error('Debes proporcionar nombre_usuario y clave_acceso.');
    }

    // 2. Buscar al usuario en la base de datos
    const [users] = await pool.query(
        'SELECT * FROM usuarios WHERE nombre_usuario = ?',
        [nombre_usuario]
    );

    const user = users[0];

    // 3. Verificar si existe el usuario y comparar la contraseña
    if (!user || !(await bcrypt.compare(clave_acceso, user.clave_acceso))) {
        throw new Error('Credenciales inválidas.');
    }

    // 4. Generar token JWT
    const payload = {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        rol: user.rol
    };

    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: '8h' });

    // 5. Preparar opciones de la cookie
    const cookieOptions = {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
    };

    // 6. Devolver los datos necesarios para que la ruta responda
    return {
        token,
        cookieOptions,
        usuario: {
            id: user.id,
            nombre_usuario: user.nombre_usuario,
            nombre_completo: user.nombre_completo,
            rol: user.rol
        }
    };
};

/**
 * Retorna las opciones necesarias para limpiar la cookie del token.
 * 
 * @returns {{ cookieOptions: Object }}
 */
export const logout = () => {
    return {
        cookieOptions: {
            httpOnly: true,
            secure: env.nodeEnv === 'production',
            sameSite: 'strict'
        }
    };
};
