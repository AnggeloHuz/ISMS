import { Router } from 'express';
import { createBackup } from '../controllers/backup.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Respaldo de Base de Datos ───────────────────

/**
 * POST /api/backup
 * Crea un respaldo de la base de datos.
 * Protegido: Requiere token JWT y rol 'administrador'.
 */
router.post(
    '/backup',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const resultado = await createBackup();

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACCESO',
                nombre_tabla: 'backup',
                valor_nuevo: { archivo: resultado.archivo },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                mensaje: 'Respaldo creado exitosamente.',
                ...resultado,
            });
        } catch (error) {
            console.error('❌ Error al crear respaldo:', error.message);
            res.status(500).json({
                estado: 'error',
                mensaje: 'No se pudo crear el respaldo de la base de datos.',
                detalle: error.message,
            });
        }
    }
);

export default router;
