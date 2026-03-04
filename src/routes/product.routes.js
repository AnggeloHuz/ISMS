import { Router } from 'express';
import { createProduct, listProducts, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Gestión de Productos ────────────────────────

/**
 * GET /api/products?page=1&limit=10
 * GET /api/products?all=true
 * Lista productos con paginación o todos de una vez.
 * Protegido: Requiere token JWT y rol 'administrador' o 'almacenista' (o 'cajero' solo lectura si quieres).
 * Aquí se requiere administrador o almacenista.
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
 * POST /api/products
 * Registra un nuevo producto.
 * Protegido: Requiere token JWT y rol 'administrador' o 'almacenista'.
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
 * PUT /api/products/:id
 * Actualiza un producto existente.
 * Protegido: Requiere token JWT y rol 'administrador' o 'almacenista'.
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
 * DELETE /api/products/:id
 * Elimina un producto de forma física (si no tiene historial).
 * Protegido: Requiere token JWT y rol 'administrador' o 'almacenista'.
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
