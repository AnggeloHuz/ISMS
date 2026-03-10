import { Router } from 'express';
import { createPurchase, listPurchases, getPurchaseById } from '../controllers/purchase.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Compras ────────────────────────

/**
 * @swagger
 * tags:
 *   name: Compras
 *   description: Gestión de compras a proveedores
 */

/**
 * @swagger
 * /purchases:
 *   get:
 *     summary: Lista el historial de compras
 *     tags: [Compras]
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
 *     responses:
 *       200:
 *         description: Ok
 */
router.get(
    '/',
    verifyToken,
    requireRole(['administrador', 'almacenista']),
    async (req, res) => {
        try {
            const { page, limit } = req.query;
            const resultado = await listPurchases({ page, limit });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) console.error('❌ Error al listar compras:', error.message);

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener las compras.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /purchases/{id}:
 *   get:
 *     summary: Obtiene todos los detalles de una compra
 *     tags: [Compras]
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
router.get(
    '/:id',
    verifyToken,
    requireRole(['administrador', 'almacenista']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const resultado = await getPurchaseById(id);

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('No se encontró') || error.message.includes('requiere');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) console.error('❌ Error al obtener detalle de compra:', error.message);

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo obtener la compra.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /purchases:
 *   post:
 *     summary: Registra una compra
 *     tags: [Compras]
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
 *               - id_proveedor
 *               - tasa_cambio_usada
 *               - productos
 *               - pagos
 *             properties:
 *               id_proveedor:
 *                 type: integer
 *               numero_factura:
 *                 type: string
 *               tasa_cambio_usada:
 *                 type: number
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_producto:
 *                       type: integer
 *                     cantidad:
 *                       type: integer
 *                     costo_unitario_dolares:
 *                       type: number
 *               pagos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_cuenta_bancaria:
 *                       type: integer
 *                     monto_pagado:
 *                       type: number
 *                     referencia:
 *                       type: string
 *     responses:
 *       201:
 *         description: Compra registrada y procesada (Stocks y Pagos)
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador', 'almacenista']),
    async (req, res) => {
        try {
            // El ID de usuario se extrae del token validado
            const dataCompra = { ...req.body, id_usuario: req.user.id };

            const resultado = await createPurchase(dataCompra);

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'compras',
                id_registro: resultado.id,
                valor_nuevo: {
                    total_dolares: resultado.total_compra_dolares,
                    proveedor: req.body.id_proveedor
                },
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                mensaje: resultado.mensaje,
                compra: {
                    id: resultado.id,
                    total_dolares: resultado.total_compra_dolares,
                    total_bolivares: resultado.total_compra_bolivares
                }
            });
        } catch (error) {
            const isValidationError = error.message.includes('inválido') ||
                error.message.includes('obligatorio') ||
                error.message.includes('coincide') ||
                error.message.includes('insuficiente') ||
                error.message.includes('no existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) console.error('❌ Error al registrar compra:', error.message);

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo registrar la compra.',
                detalle: error.message
            });
        }
    }
);

// Nota: PUT y DELETE omitidos intencionalmente por integridad de inventarios.

export default router;
