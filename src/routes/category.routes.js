import { Router } from 'express';
import { createCategory, listCategories, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Categorías ───────────────────────

/**
 * @swagger
 * tags:
 *   name: Categorías
 *   description: Gestión de categorías de productos
 */

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Lista categorías con paginación o todas de una vez
 *     tags: [Categorías]
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
 *         description: Si es true, ignora la paginación
 *     responses:
 *       200:
 *         description: Lista de categorías obtenida
 */
router.get(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { page, limit, all } = req.query;
            const allFlag = all === 'true' || all === '1';

            const resultado = await listCategories({ page, limit, all: allFlag });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al listar categorías:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener las categorías.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Crea una nueva categoría
 *     tags: [Categorías]
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
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoría creada
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { nombre, descripcion } = req.body;

            const nuevaCategoria = await createCategory({ nombre, descripcion });

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'categorias',
                id_registro: nuevaCategoria.id,
                valor_nuevo: nuevaCategoria,
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                mensaje: 'Categoría creada exitosamente.',
                categoria: nuevaCategoria
            });
        } catch (error) {
            const isValidationError = error.message.includes('obligatorio') ||
                error.message.includes('Ya existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al crear categoría:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo crear la categoría.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Actualiza una categoría existente
 *     tags: [Categorías]
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
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Categoría actualizada
 */
router.put(
    '/:id',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, descripcion } = req.body;

            const resultado = await updateCategory({ id, nombre, descripcion });

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACTUALIZAR',
                nombre_tabla: 'categorias',
                id_registro: Number(id),
                valor_anterior: resultado.anterior,
                valor_nuevo: { nombre: resultado.nombre, descripcion: resultado.descripcion },
                direccion_ip: req.ip
            });

            res.status(200).json({
                estado: 'ok',
                mensaje: 'Categoría actualizada exitosamente.',
                categoria: {
                    id: resultado.id,
                    nombre: resultado.nombre,
                    descripcion: resultado.descripcion
                }
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrada') ||
                error.message.includes('Ya existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) {
                console.error('❌ Error al actualizar categoría:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo actualizar la categoría.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Elimina una categoría
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Categoría eliminada
 *       400:
 *         description: No se puede eliminar si tiene productos asociados
 */
router.delete(
    '/:id',
    verifyToken,
    requireRole(['administrador']),
    async (req, res) => {
        try {
            const { id } = req.params;

            const resultado = await deleteCategory(id);

            // Registrar en bitácora
            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ELIMINAR',
                nombre_tabla: 'categorias',
                id_registro: Number(id),
                valor_anterior: { nombre: resultado.nombre },
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
                console.error('❌ Error al eliminar categoría:', error.message);
            }

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo eliminar la categoría.',
                detalle: error.message
            });
        }
    }
);

export default router;
