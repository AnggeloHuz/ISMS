import { Router } from 'express';
import { listAuditLog } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Bitácora de Auditoría ───────────────────────

/**
 * GET /api/audit?page=1&limit=10
 * Lista los registros de auditoría con paginación.
 * Protegido: Requiere token JWT y rol 'administrador'.
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
