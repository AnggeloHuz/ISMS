import { Router } from 'express';
import { createSale, listSales, getSaleById } from '../controllers/sale.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Ventas ──────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Ventas
 *   description: Gestión de ventas a clientes
 */

/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Registra una nueva venta
 *     tags: [Ventas]
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
 *               - tasa_cambio_usada
 *               - productos
 *               - pagos
 *             properties:
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
 *                     precio_unitario_dolares:
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
 *         description: Venta concretada (Stock deducido, saldo incrementado)
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador', 'cajero']),
    async (req, res) => {
        try {
            const { tasa_cambio_usada, productos, pagos } = req.body;

            const nuevaVenta = await createSale({
                id_usuario: req.user.id,
                tasa_cambio_usada,
                productos,
                pagos
            });

            // Registrar en bitácora (Solo el hecho de la creación)
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'ventas',
                id_registro: nuevaVenta.id,
                valor_nuevo: {
                    total_dolares: nuevaVenta.total_dolares,
                    total_bolivares: nuevaVenta.total_bolivares
                },
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                ...nuevaVenta
            });
        } catch (error) {
            const isValidationError =
                error.message.includes('inválid') ||
                error.message.includes('obligatorio') ||
                error.message.includes('no existe') ||
                error.message.includes('no coincide') ||
                error.message.includes('Stock insuficiente');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al registrar venta:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo registrar la venta.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Lista el historial de ventas
 *     tags: [Ventas]
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
    requireRole(['administrador', 'cajero']),
    async (req, res) => {
        try {
            const { page, limit } = req.query;

            const resultado = await listSales({ page, limit });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al listar ventas:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener las ventas.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Obtiene los detalles completos de una venta
 *     tags: [Ventas]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Información, detalle y pagos de la venta
 */
router.get(
    '/:id',
    verifyToken,
    requireRole(['administrador', 'cajero']),
    async (req, res) => {
        try {
            const { id } = req.params;

            const resultado = await getSaleById(id);

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no se encontró');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al obtener detalle de venta:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo obtener el detalle de la venta.',
                detalle: error.message
            });
        }
    }
);

export default router;
