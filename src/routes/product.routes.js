import { Router } from 'express';
import { createProduct, listProducts, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Productos ────────────────────────

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Gestión del inventario de productos
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Lista productos
 *     tags: [Productos]
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
    requireRole(['administrador', 'almacenista', 'cajero']),
    async (req, res) => {
        try {
            const { page, limit, all } = req.query;
            const allFlag = all === 'true' || all === '1';

            const resultado = await listProducts({ page, limit, all: allFlag });

            res.status(200).json({
                estado: 'ok',
                ...resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('no existe');
            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) console.error('❌ Error al listar productos:', error.message);

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudieron obtener los productos.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Registra un nuevo producto
 *     tags: [Productos]
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
 *               - id_categoria
 *               - costo_dolares
 *               - precio_dolares
 *             properties:
 *               codigo_barras:
 *                 type: string
 *               nombre:
 *                 type: string
 *               id_categoria:
 *                 type: integer
 *               costo_dolares:
 *                 type: number
 *               precio_dolares:
 *                 type: number
 *               stock_actual:
 *                 type: integer
 *               stock_minimo:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Ok
 */
router.post(
    '/',
    verifyToken,
    requireRole(['administrador', 'almacenista']),
    async (req, res) => {
        try {
            const productoData = req.body;
            const nuevoProducto = await createProduct(productoData);

            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'INSERTAR',
                nombre_tabla: 'productos',
                id_registro: nuevoProducto.id,
                valor_nuevo: nuevoProducto,
                direccion_ip: req.ip
            });

            res.status(201).json({
                estado: 'ok',
                mensaje: 'Producto creado exitosamente.',
                producto: nuevoProducto
            });
        } catch (error) {
            const isValidationError = error.message.includes('obligatorio') ||
                error.message.includes('Ya existe') ||
                error.message.includes('no existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) console.error('❌ Error al crear producto:', error.message);

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo crear el producto.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Actualiza un producto existente
 *     tags: [Productos]
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
 *               codigo_barras:
 *                 type: string
 *               nombre:
 *                 type: string
 *               id_categoria:
 *                 type: integer
 *               costo_dolares:
 *                 type: number
 *               precio_dolares:
 *                 type: number
 *               stock_minimo:
 *                 type: integer
 *               esta_activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Ok
 */
router.put(
    '/:id',
    verifyToken,
    requireRole(['administrador', 'almacenista']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const productoData = req.body;

            const resultado = await updateProduct({ id, ...productoData });

            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ACTUALIZAR',
                nombre_tabla: 'productos',
                id_registro: Number(id),
                valor_anterior: resultado.anterior,
                valor_nuevo: {
                    codigo_barras: resultado.codigo_barras,
                    nombre: resultado.nombre,
                    id_categoria: resultado.id_categoria,
                    costo_dolares: resultado.costo_dolares,
                    precio_dolares: resultado.precio_dolares,
                    stock_actual: resultado.stock_actual,
                    stock_minimo: resultado.stock_minimo,
                    esta_activo: resultado.esta_activo
                },
                direccion_ip: req.ip
            });

            // Limpiamos 'anterior' de la respuesta JSON para que no llegue al cliente
            delete resultado.anterior;

            res.status(200).json({
                estado: 'ok',
                mensaje: 'Producto actualizado exitosamente.',
                producto: resultado
            });
        } catch (error) {
            const isValidationError = error.message.includes('requiere') ||
                error.message.includes('no fue encontrado') ||
                error.message.includes('Ya existe') ||
                error.message.includes('no existe');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) console.error('❌ Error al actualizar producto:', error.message);

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo actualizar el producto.',
                detalle: error.message
            });
        }
    }
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Elimina un producto lógicamente o físicamente si no tiene historial
 *     tags: [Productos]
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
    requireRole(['administrador', 'almacenista']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const resultado = await deleteProduct(id);

            await registrarBitacora({
                id_usuario: req.user.id,
                operacion: 'ELIMINAR',
                nombre_tabla: 'productos',
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
                error.message.includes('no fue encontrado') ||
                error.message.includes('No se puede eliminar');

            const statusCode = isValidationError ? 400 : 500;

            if (!isValidationError) console.error('❌ Error al eliminar producto:', error.message);

            res.status(statusCode).json({
                estado: 'error',
                mensaje: 'No se pudo eliminar el producto.',
                detalle: error.message
            });
        }
    }
);

export default router;
