import app from './app.js';
import env from './config/env.js';
import initDatabase from './database/initDatabase.js';

const PORT = env.port;

// ─── Iniciar servidor y base de datos ─────────────
const iniciar = async () => {
    try {
        // Ejecutar migración (crear BD y tablas si no existen)
        await initDatabase();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor ISMS corriendo en http://localhost:${PORT}`);
            console.log(`   Entorno: ${env.nodeEnv}`);
            console.log(`   Verificación de salud: http://localhost:${PORT}/api/health\n`);
        });
    } catch (error) {
        console.error('❌ No se pudo iniciar el servidor:', error.message);
        process.exit(1);
    }
};

iniciar();
