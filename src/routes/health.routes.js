import { Router } from 'express';
import env from '../config/env.js';

const router = Router();

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
