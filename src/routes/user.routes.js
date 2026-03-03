import { Router } from 'express';
import { createUser, listUsers, updatePassword, updateRole, deleteUser } from '../controllers/user.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Usuarios ─────────────────────────

/**
 * GET /api/users?page=1&limit=10
 * Lista todos los usuarios con paginación.
 * Protegido: Requiere token JWT y rol 'administrador'.
 */
router.get(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { page, limit } = req.query;
            const resultado = await listUsers({ page, limit });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al listar usuarios:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener los usuarios.',
                detalle: error.message
            });
        }
    }
);

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

/**
 * PATCH /api/users/:id/password
 * Actualiza la contraseña de un usuario.
 * Protegido: Requiere token JWT y rol 'administrador'.
 */
router.patch(
    '/:id/password',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { nueva_clave } = req.body;

            const resultado = await updatePassword({ id, nueva_clave });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('al menos') ||
                error.message.includes('no fue encontrado');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al actualizar contraseña:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo actualizar la contraseña.',
                detalle: error.message
            });
        }
    }
);

/**
 * PATCH /api/users/:id/role
 * Actualiza el rol de un usuario.
 * Protegido: Requiere token JWT y rol 'administrador'.
 */
router.patch(
    '/:id/role',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { nuevo_rol } = req.body;

            const resultado = await updateRole({ id, nuevo_rol });

            res.status(200).json({
                estado: 'ok',
                mensaje: 'Rol actualizado exitosamente.',
                usuario: resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('inválido') ||
                error.message.includes('no fue encontrado');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al actualizar rol:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo actualizar el rol.',
                detalle: error.message
            });
        }
    }
);

/**
 * DELETE /api/users/:id
 * Desactiva un usuario (soft delete).
 * Protegido: Requiere token JWT y rol 'administrador'.
 */
router.delete(
    '/:id',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;

            // No permitir que el administrador se elimine a sí mismo
            if (Number(id) === req.user.id) {
                return res.status(400).json({
                    estado: 'error',
                    mensaje: 'No puedes desactivar tu propia cuenta.'
                });
            }

            const resultado = await deleteUser(id);

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrado') ||
                error.message.includes('ya se encuentra');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al eliminar usuario:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo eliminar el usuario.',
                detalle: error.message
            });
        }
    }
);

export default router;
