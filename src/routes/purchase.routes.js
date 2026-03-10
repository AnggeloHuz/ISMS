import { Router } from 'express';
import { createPurchase, listPurchases, getPurchaseById } from '../controllers/purchase.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Compras ────────────────────────

/**
 * GET /api/purchases?page=1&limit=10
 * Lista el historial de compras (Paginado).
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
 * GET /api/purchases/:id
 * Obtiene todos los detalles de una compra (cabecera, productos, pagos).
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
 * POST /api/purchases
 * Registra una compra. Ejecuta transacción: actualiza stock y resta saldos.
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
