import env from '../config/env.js';

// ─── Manejador 404 ────────────────────────────────
export const notFoundHandler = (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
};

// ─── Manejador Global de Errores ──────────────────
export const globalErrorHandler = (err, _req, res, _next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: env.nodeEnv === 'production' ? 'Error interno del servidor' : err.message,
    });
};
