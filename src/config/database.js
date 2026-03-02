import mysql from 'mysql2/promise';
import env from './env.js';

// ─── Pool de conexiones a MySQL ───────────────────
const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

/**
 * Verifica la conexión a la base de datos.
 * @returns {Promise<boolean>}
 */
export const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL establecida correctamente.');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con MySQL:', error.message);
        return false;
    }
};

export default pool;
