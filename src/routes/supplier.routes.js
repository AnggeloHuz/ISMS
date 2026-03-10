import { Router } from 'express';
import { createSupplier, listSuppliers, updateSupplier, deleteSupplier } from '../controllers/supplier.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Proveedores ──────────────────────

/**
 * @swagger
 * tags:
 *   name: Proveedores
 *   description: Gestión de proveedores
 */

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Lista proveedores con paginación o todos a la vez
 *     tags: [Proveedores]
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

            const resultado = await listSuppliers({ page, limit, all: allFlag });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al listar proveedores:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener los proveedores.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Crea un nuevo proveedor
 *     tags: [Proveedores]
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
 *               - rif
 *               - razon_social
 *             properties:
 *               rif:
 *                 type: string
 *               razon_social:
 *                 type: string
 *               nombre_contacto:
 *                 type: string
 *               telefono:
 *                 type: string
 *               direccion:
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
            const { rif, razon_social, nombre_contacto, telefono, direccion } = req.body;

            const nuevoProveedor = await createSupplier({
                rif, razon_social, nombre_contacto, telefono, direccion
            });

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'proveedores',
                id_registro: nuevoProveedor.id,
                valor_nuevo: nuevoProveedor,
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                mensaje: 'Proveedor creado exitosamente.',
                proveedor: nuevoProveedor
            });
        } catch (error) {
            const isValidationError = error.message.includes('obligatori') ||
                error.message.includes('Ya existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al crear proveedor:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo crear el proveedor.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     summary: Actualiza un proveedor existente
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rif:
 *                 type: string
 *               razon_social:
 *                 type: string
 *               nombre_contacto:
 *                 type: string
 *               telefono:
 *                 type: string
 *               direccion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ok
 */
router.put(
    '/:id',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { rif, razon_social, nombre_contacto, telefono, direccion } = req.body;

            const resultado = await updateSupplier({
                id, rif, razon_social, nombre_contacto, telefono, direccion
            });

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACTUALIZAR',
                nombre_tabla: 'proveedores',
                id_registro: Number(id),
                valor_anterior: resultado.anterior,
                valor_nuevo: {
                    rif: resultado.rif,
                    razon_social: resultado.razon_social,
                    nombre_contacto: resultado.nombre_contacto,
                    telefono: resultado.telefono,
                    direccion: resultado.direccion
                },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                mensaje: 'Proveedor actualizado exitosamente.',
                proveedor: {
                    id: resultado.id,
                    rif: resultado.rif,
                    razon_social: resultado.razon_social,
                    nombre_contacto: resultado.nombre_contacto,
                    telefono: resultado.telefono,
                    direccion: resultado.direccion
                }
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrado') ||
                error.message.includes('Ya existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al actualizar proveedor:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo actualizar el proveedor.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     summary: Elimina un proveedor
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Ok
 */
router.delete(
    '/:id',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;

            const resultado = await deleteSupplier(id);

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ELIMINAR',
                nombre_tabla: 'proveedores',
                id_registro: Number(id),
                valor_anterior: { rif: resultado.rif, razon_social: resultado.razon_social },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrado') ||
                error.message.includes('No se puede eliminar');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al eliminar proveedor:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo eliminar el proveedor.',
                detalle: error.message
            });
        }
    }
);

export default router;
