import pool from '../config/database.js';

/**
 * Registra un evento en la bitácora de auditoría.
 * Esta función NO lanza errores: si falla, solo escribe en consola
 * para no interrumpir la respuesta al cliente.
 *
 * @param {Object} params
 * @param {number}  params.id_usuario     ID del usuario que realizó la acción
 * @param {string}  params.operacion      INSERTAR | ACTUALIZAR | ELIMINAR | ACCESO | SALIDA
 * @param {string}  [params.nombre_tabla] Tabla afectada
 * @param {number}  [params.id_registro]  ID del registro afectado
 * @param {Object}  [params.valor_anterior] Datos antes del cambio (se guarda como JSON)
 * @param {Object}  [params.valor_nuevo]    Datos después del cambio (se guarda como JSON)
 * @param {string}  [params.direccion_ip]   IP del cliente
 */
export const registrarBitacora = async ({
    id_usuario,
    operacion,
    nombre_tabla = null,
    id_registro = null,
    valor_anterior = null,
    valor_nuevo = null,
    direccion_ip = null
}) => {
    try {
        await pool.query(
            `INSERT INTO bitacora_auditoria 
             (id_usuario, operacion, nombre_tabla, id_registro, valor_anterior, valor_nuevo, direccion_ip)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id_usuario,
                operacion,
                nombre_tabla,
                id_registro,
                valor_anterior ? JSON.stringify(valor_anterior) : null,
                valor_nuevo ? JSON.stringify(valor_nuevo) : null,
                direccion_ip
            ]
        );
    } catch (error) {
        console.error('⚠️ Error al registrar en bitácora:', error.message);
    }
};

/**
 * Lista los registros de la bitácora de auditoría con paginación.
 * Incluye el nombre_usuario del usuario que realizó la acción.
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @returns {Promise<{ registros: Object[], paginacion: Object }>}
 */
export const listAuditLog = async ({ page = 1, limit = 10 } = {}) => {
    const pagina = Math.max(1, parseInt(page, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pagina - 1) * limite;

    // Contar total
    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM bitacora_auditoria');
    const total = countResult[0].total;
    const totalPaginas = Math.ceil(total / limite);

    if (total > 0 && pagina > totalPaginas) {
        throw new Error(`La página ${pagina} no existe. Solo hay ${totalPaginas} página(s) disponible(s).`);
    }

    // Consultar con JOIN para incluir nombre_usuario
    const [registros] = await pool.query(
        `SELECT 
            b.id,
            b.id_usuario,
            u.nombre_usuario,
            b.operacion,
            b.nombre_tabla,
            b.id_registro,
            b.valor_anterior,
            b.valor_nuevo,
            b.direccion_ip,
            b.fecha_evento
         FROM bitacora_auditoria b
         LEFT JOIN usuarios u ON b.id_usuario = u.id
         ORDER BY b.fecha_evento DESC
         LIMIT ? OFFSET ?`,
        [limite, offset]
    );

    return {
        registros,
        paginacion: {
            total,
            pagina,
            limite,
            totalPaginas
        }
    };
};
