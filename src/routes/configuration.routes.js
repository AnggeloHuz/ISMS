import { Router } from 'express';
import { createConfiguration, listConfigurations, updateConfiguration, deleteConfiguration } from '../controllers/configuration.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Configuraciones ───────────────────────

/**
 * @swagger
 * tags:
 *   name: Configuraciones
 *   description: Parámetros globales del sistema
 */

/**
 * @swagger
 * /configurations:
 *   get:
 *     summary: Lista configuraciones
 *     tags: [Configuraciones]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Ok
 */
router.get(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { page, limit, all } = req.query;
            const allFlag = all === 'true' || all === '1';

            const resultado = await listConfigurations({ page, limit, all: allFlag });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al listar configuraciones:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener las configuraciones.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /configurations:
 *   post:
 *     summary: Agrega una nueva variable de configuración
 *     tags: [Configuraciones]
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
 *               - clave_configuracion
 *               - valor_configuracion
 *             properties:
 *               clave_configuracion:
 *                 type: string
 *               valor_configuracion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ok
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { clave_configuracion, valor_configuracion } = req.body;

            const nuevaConfiguracion = await createConfiguration({ clave_configuracion, valor_configuracion });

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'configuraciones',
                id_registro: null, // No es INT
                valor_nuevo: nuevaConfiguracion,
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                mensaje: 'Configuración creada exitosamente.',
                configuracion: nuevaConfiguracion
            });
        } catch (error) {
            const isValidationError = error.message.includes('obligatorio') ||
                error.message.includes('Ya existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al crear configuración:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo crear la configuración.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /configurations/{clave_configuracion}:
 *   put:
 *     summary: Actualiza el valor de una configuración
 *     tags: [Configuraciones]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: clave_configuracion
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - valor_configuracion
 *             properties:
 *               valor_configuracion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ok
 */
router.put(
    '/:clave_configuracion',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { clave_configuracion } = req.params;
            const { valor_configuracion } = req.body;

            const resultado = await updateConfiguration({ clave_configuracion, valor_configuracion });

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACTUALIZAR',
                nombre_tabla: 'configuraciones',
                id_registro: null, // No es INT
                valor_anterior: resultado.anterior,
                valor_nuevo: { clave_configuracion: resultado.clave_configuracion, valor_configuracion: resultado.valor_configuracion },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                mensaje: 'Configuración actualizada exitosamente.',
                configuracion: {
                    clave_configuracion: resultado.clave_configuracion,
                    valor_configuracion: resultado.valor_configuracion
                }
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrada');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al actualizar configuración:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo actualizar la configuración.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /configurations/{clave_configuracion}:
 *   delete:
 *     summary: Elimina una variable de configuración
 *     tags: [Configuraciones]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: clave_configuracion
 *         required: true
 *     responses:
 *       200:
 *         description: Ok
 */
router.delete(
    '/:clave_configuracion',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { clave_configuracion } = req.params;

            const resultado = await deleteConfiguration(clave_configuracion);

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ELIMINAR',
                nombre_tabla: 'configuraciones',
                id_registro: null,
                valor_anterior: { clave_configuracion: resultado.clave_configuracion, valor_configuracion: resultado.valor_configuracion },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrada');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al eliminar configuración:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo eliminar la configuración.',
                detalle: error.message
            });
        }
    }
);

export default router;
