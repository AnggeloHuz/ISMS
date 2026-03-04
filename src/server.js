import app from './app.js';
import env from './config/env.js';
import initDatabase from './database/initDatabase.js';

const PORT = env.port;

// ─── Iniciar base de datos y servidor ─────────────
try {
    await initDatabase();
} catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error.message);
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor ISMS corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno: ${env.nodeEnv}`);
    console.log(`   Verificación de salud: http://localhost:${PORT}/api/health\n`);
});
