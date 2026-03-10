import { Router } from 'express';
import env from '../config/env.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Estado de salud del sistema
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica que el servidor esté activo
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: El servidor está funcionando correctamente
 */
// ─── Verificación de Salud ────────────────────────
router.get('/health', (_req, res) => {
    res.json({
        estado: 'ok',
        servicio: 'ISMS',
        entorno: env.nodeEnv,
        fecha: new Date().toISOString(),
    });
});

export default router;
