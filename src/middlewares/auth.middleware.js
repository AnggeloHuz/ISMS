import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Middleware para verificar que la petición contiene un token JWT válido.
 * Si es válido, inyecta la información decodificada del usuario en `req.user`.
 */
export const verifyToken = (req, res, next) => {
    // Buscar el token en las cookies primero, luego en el header Authorization
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            estado: 'error',
            mensaje: 'Acceso denegado. No se proporcionó un token válido.',
        });
    }

    try {
        // Verificar el token con la firma secreta
        const decoded = jwt.verify(token, env.jwtSecret);

        // Agregar el payload del token (id, rol, etc.) a la request
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            estado: 'error',
            mensaje: 'Token inválido o expirado.',
            detalle: error.message,
        });
    }
};

/**
 * Middleware fábrica para requerir roles específicos en una ruta.
 * IMPORTANTE: Debe usarse DESPUÉS de verifyToken.
 * 
 * @param {string[]} roles Permitidos (ej: ['administrador', 'cajero'])
 */
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.rol) {
            return res.status(403).json({
                estado: 'error',
                mensaje: 'No se pudo determinar el rol del usuario.',
            });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                estado: 'error',
                mensaje: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}.`,
                rolActual: req.user.rol
            });
        }

        next();
    };
};
