import { Router } from 'express';
import { createCategory, listCategories, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Categorías ───────────────────────

/**
 * GET /api/categories?page=1&limit=10
 * GET /api/categories?all=true
 * Lista categorías con paginación o todas de una vez.
 * Protegido: Requiere token JWT y rol 'administrador'.
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
 * POST /api/categories
 * Crea una nueva categoría.
 * Protegido: Requiere token JWT y rol 'administrador'.
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
 * PUT /api/categories/:id
 * Actualiza una categoría existente.
 * Protegido: Requiere token JWT y rol 'administrador'.
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
 * DELETE /api/categories/:id
 * Elimina una categoría.
 * Protegido: Requiere token JWT y rol 'administrador'.
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
