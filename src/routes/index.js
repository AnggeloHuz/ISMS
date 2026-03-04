import { Router } from 'express';
import healthRoutes from './health.routes.js';
import backupRoutes from './backup.routes.js';
import userRoutes from './user.routes.js';
import authRoutes from './auth.routes.js';
import auditRoutes from './audit.routes.js';
import categoryRoutes from './category.routes.js';
import supplierRoutes from './supplier.routes.js';
import bankAccountRoutes from './bankAccount.routes.js';

const router = Router();

// ─── Registrar rutas ──────────────────────────────
router.use('/', healthRoutes);
router.use('/', backupRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/audit', auditRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/bank-accounts', bankAccountRoutes);

export default router;

