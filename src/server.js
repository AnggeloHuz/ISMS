import app from './app.js';
import env from './config/env.js';

const PORT = env.port;

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor ISMS corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno: ${env.nodeEnv}`);
    console.log(`   Verificación de salud: http://localhost:${PORT}/api/health\n`);
});
