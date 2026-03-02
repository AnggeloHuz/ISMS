import dotenv from 'dotenv';

dotenv.config();

const env = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    corsOrigin: process.env.CORS_ORIGIN || '*',

    // Base de Datos
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        name: process.env.DB_NAME || 'sistema_gestion_abasto',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        mysqldumpPath: process.env.MYSQLDUMP_PATH || 'mysqldump',
    },
};

// Validar variables de entorno requeridas
const requiredVars = ['JWT_SECRET', 'DB_USER'];
const missingVars = requiredVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
    console.error(`❌ Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
    console.error('   Por favor revisa tu archivo .env.');
    process.exit(1);
}

export default env;
