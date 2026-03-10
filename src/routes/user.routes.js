import { Router } from 'express';
import { createUser, listUsers, updatePassword, updateRole, deleteUser } from '../controllers/user.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Usuarios ─────────────────────────

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios del sistema
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista todos los usuarios con paginación
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Cantidad de registros por página
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente.
 *       401:
 *         description: No autorizado.
 *       403:
 *         description: Acceso denegado (requiere rol de administrador).
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
 * @swagger
 * /users:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre_usuario
 *               - clave_acceso
 *               - rol
 *             properties:
 *               nombre_usuario:
 *                 type: string
 *               clave_acceso:
 *                 type: string
 *               nombre_completo:
 *                 type: string
 *               rol:
 *                 type: string
 *                 enum: [administrador, cajero, almacenista]
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente.
 *       400:
 *         description: Error de validación (ej. usuario ya existe).
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { nombre_usuario, clave_acceso, nombre_completo, rol } = req.body;

            const nuevoUsuario = await createUser({
                nombre_usuario,
                clave_acceso,
                nombre_completo,
                rol
            });

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'usuarios',
                id_registro: nuevoUsuario.id,
                valor_nuevo: nuevoUsuario,
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                mensaje: 'Usuario creado exitosamente.',
                usuario: nuevoUsuario
            });
        } catch (error) {
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
 * @swagger
 * /users/{id}/password:
 *   patch:
 *     summary: Actualiza la contraseña de un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nueva_clave
 *             properties:
 *               nueva_clave:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente.
 *       400:
 *         description: Error de validación (ej. contraseña muy corta).
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

            // Registrar en bitácora (sin exponer contraseñas)
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACTUALIZAR',
                nombre_tabla: 'usuarios',
                id_registro: Number(id),
                valor_nuevo: { campo: 'clave_acceso', nota: 'Contraseña actualizada' },
                direccion_ip: req.ip
            });

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
 * @swagger
 * /users/{id}/role:
 *   patch:
 *     summary: Actualiza el rol de un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nuevo_rol
 *             properties:
 *               nuevo_rol:
 *                 type: string
 *                 enum: [administrador, cajero, almacenista]
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente.
 *       400:
 *         description: Rol inválido o usuario no encontrado.
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

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACTUALIZAR',
                nombre_tabla: 'usuarios',
                id_registro: Number(id),
                valor_anterior: { rol: resultado.nombre_usuario },
                valor_nuevo: { rol: resultado.nuevo_rol },
                direccion_ip: req.ip
            });

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
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Desactiva un usuario (soft delete)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario desactivado correctamente.
 *       400:
 *         description: No se puede eliminar a sí mismo o ya está desactivado.
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

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ELIMINAR',
                nombre_tabla: 'usuarios',
                id_registro: Number(id),
                valor_anterior: { nombre_usuario: resultado.nombre_usuario, esta_activo: true },
                valor_nuevo: { esta_activo: false },
                direccion_ip: req.ip
            });

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
