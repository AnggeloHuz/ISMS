import { execFile } from 'child_process';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import env from '../config/env.js';

// ─── Directorio de respaldos ─────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.resolve(__dirname, '../../backups');

/**
 * Genera un nombre de archivo con timestamp.
 * Formato: backup_YYYY-MM-DD_HH-mm-ss.sql
 */
const generateFileName = () => {
    const now = new Date();
    const timestamp = now
        .toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .replace(/\..+/, '');
    return `backup_${timestamp}.sql`;
};

/**
 * Crea un respaldo completo de la base de datos usando mysqldump.
 * @returns {Promise<{ archivo: string, ruta: string, fecha: string }>}
 * @throws {Error} Si ocurre un error al ejecutar mysqldump.
 */
export const createBackup = async () => {
    // Asegurar que el directorio de backups exista
    await mkdir(BACKUP_DIR, { recursive: true });

    const fileName = generateFileName();
    const filePath = path.join(BACKUP_DIR, fileName);

    // Construir argumentos para mysqldump
    const args = [
        `-h${env.db.host}`,
        `-P${env.db.port}`,
        `-u${env.db.user}`,
        `--result-file=${filePath}`,
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        env.db.name,
    ];

    // Agregar password solo si existe
    if (env.db.password) {
        args.splice(3, 0, `-p${env.db.password}`);
    }

    // Ejecutar mysqldump
    await new Promise((resolve, reject) => {
        const cmd = env.db.mysqldumpPath;
        execFile(cmd, args, (error, _stdout, stderr) => {
            if (error) {
                return reject(
                    new Error(`Error al ejecutar mysqldump: ${error.message}`)
                );
            }
            if (stderr && !stderr.toLowerCase().includes('warning')) {
                return reject(new Error(`mysqldump stderr: ${stderr}`));
            }
            resolve();
        });
    });

    return {
        archivo: fileName,
        ruta: filePath,
        fecha: new Date().toISOString(),
    };
};
