import { Router } from 'express';
import { createBankAccount, listBankAccounts, updateBankAccount, deleteBankAccount } from '../controllers/bankAccount.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Cuentas Bancarias ────────────────

/**
 * @swagger
 * tags:
 *   name: Cuentas Bancarias
 *   description: Gestión de cuentas bancarias
 */

/**
 * @swagger
 * /bank-accounts:
 *   get:
 *     summary: Lista cuentas bancarias
 *     tags: [Cuentas Bancarias]
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
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Ok
 */
router.get(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { page, limit, all } = req.query;
            const allFlag = all === 'true' || all === '1';

            const resultado = await listBankAccounts({ page, limit, all: allFlag });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al listar cuentas bancarias:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener las cuentas bancarias.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /bank-accounts:
 *   post:
 *     summary: Registra una nueva cuenta bancaria
 *     tags: [Cuentas Bancarias]
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
 *               - nombre_cuenta
 *               - moneda
 *             properties:
 *               nombre_cuenta:
 *                 type: string
 *               moneda:
 *                 type: string
 *                 enum: [USD, VES]
 *               saldo_actual:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ok
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { nombre_cuenta, moneda, saldo_actual } = req.body;

            const nuevaCuenta = await createBankAccount({ nombre_cuenta, moneda, saldo_actual });

            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'cuentas_bancarias',
                id_registro: nuevaCuenta.id,
                valor_nuevo: nuevaCuenta,
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                mensaje: 'Cuenta bancaria registrada exitosamente.',
                cuenta: nuevaCuenta
            });
        } catch (error) {
            const isValidationError = error.message.includes('obligatori') ||
                error.message.includes('inválida') ||
                error.message.includes('Ya existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al crear cuenta bancaria:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo registrar la cuenta bancaria.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /bank-accounts/{id}:
 *   put:
 *     summary: Actualiza una cuenta bancaria
 *     tags: [Cuentas Bancarias]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_cuenta:
 *                 type: string
 *               moneda:
 *                 type: string
 *                 enum: [USD, VES]
 *               esta_activa:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Ok
 */
router.put(
    '/:id',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre_cuenta, moneda, esta_activa } = req.body;

            const resultado = await updateBankAccount({ id, nombre_cuenta, moneda, esta_activa });

            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACTUALIZAR',
                nombre_tabla: 'cuentas_bancarias',
                id_registro: Number(id),
                valor_anterior: resultado.anterior,
                valor_nuevo: {
                    nombre_cuenta: resultado.nombre_cuenta,
                    moneda: resultado.moneda,
                    esta_activa: resultado.esta_activa
                },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                mensaje: 'Cuenta bancaria actualizada exitosamente.',
                cuenta: {
                    id: resultado.id,
                    nombre_cuenta: resultado.nombre_cuenta,
                    moneda: resultado.moneda,
                    saldo_actual: resultado.saldo_actual,
                    esta_activa: resultado.esta_activa
                }
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrada') ||
                error.message.includes('inválida') ||
                error.message.includes('Ya existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al actualizar cuenta bancaria:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo actualizar la cuenta bancaria.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /bank-accounts/{id}:
 *   delete:
 *     summary: Elimina una cuenta bancaria
 *     tags: [Cuentas Bancarias]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Ok
 */
router.delete(
    '/:id',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;

            const resultado = await deleteBankAccount(id);

            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ELIMINAR',
                nombre_tabla: 'cuentas_bancarias',
                id_registro: Number(id),
                valor_anterior: { nombre_cuenta: resultado.nombre_cuenta },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrada') ||
                error.message.includes('No se puede eliminar');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al eliminar cuenta bancaria:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo eliminar la cuenta bancaria.',
                detalle: error.message
            });
        }
    }
);

export default router;
