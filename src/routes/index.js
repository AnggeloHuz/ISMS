import { Router } from 'express';
import healthRoutes from './health.routes.js';
import backupRoutes from './backup.routes.js';

const router = Router();

// ─── Registrar rutas ──────────────────────────────
router.use('/', healthRoutes);
router.use('/', backupRoutes);

export default router;
