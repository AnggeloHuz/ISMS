import { Router } from 'express';
import { listAuditLog } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Bitácora de Auditoría ───────────────────────

/**
 * @swagger
 * tags:
 *   name: Auditoría
 *   description: Consulta de la bitácora de eventos del sistema
 */

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Lista los registros de auditoría con paginación
 *     tags: [Auditoría]
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
 *         description: Retorna la lista de auditoría paginada
 *       400:
 *         description: Parámetros inválidos
 */
router.get(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { page, limit } = req.query;
            const resultado = await listAuditLog({ page, limit });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al listar bitácora:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo obtener la bitácora de auditoría.',
                detalle: error.message
            });
        }
    }
);

export default router;
