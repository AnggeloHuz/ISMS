import { Router } from 'express';
import { createBackup } from '../controllers/backup.controller.js';

const router = Router();

// ─── Respaldo de Base de Datos ───────────────────
router.post('/backup', async (_req, res) => {
    try {
        const resultado = await createBackup();

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
});

export default router;
