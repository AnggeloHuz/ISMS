import { Router } from 'express';
import { createUser } from '../controllers/user.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Usuarios ─────────────────────────

/**
 * POST /api/users
 * Crea un nuevo usuario en el sistema.
 * Protegido: Requiere token JWT y el rol de 'administrador'.
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            // Extraer datos del body
            const { nombre_usuario, clave_acceso, nombre_completo, rol } = req.body;

            // Delegar toda la lógica al controlador
            const nuevoUsuario = await createUser({
                nombre_usuario,
                clave_acceso,
                nombre_completo,
                rol
            });

            // Responder al cliente
            res.status(201).json({
                estado: 'ok',
                mensaje: 'Usuario creado exitosamente.',
                usuario: nuevoUsuario
            });
        } catch (error) {
            // Manejar errores de validación (400) o de base de datos (500)
            const isValidationError = error.message.includes('obligatorios') ||
                error.message.includes('inválido') ||
                error.message.includes('en uso');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al crear usuario:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo crear el usuario.',
                detalle: error.message
            });
        }
    }
);

export default router;
