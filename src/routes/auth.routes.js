import { Router } from 'express';
import { login, logout } from '../controllers/auth.controller.js';
import { registrarBitacora } from '../controllers/audit.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Autenticación ───────────────────────────────

/**
 * POST /api/auth/login
 * Inicia sesión y devuelve una cookie de autenticación.
 */
router.post('/login', async (req, res) => {
    try {
        const { nombre_usuario, clave_acceso } = req.body;

        // Delegar la lógica al controlador
        const { token, cookieOptions, usuario } = await login({
            nombre_usuario,
            clave_acceso
        });

        // Establecer la cookie y responder al cliente
        res.cookie('token', token, cookieOptions);

        // Registrar en bitácora
        await registrarBitacora({
            id_usuario: usuario.id,
            operacion: 'ACCESO',
            nombre_tabla: 'usuarios',
            id_registro: usuario.id,
            direccion_ip: req.ip
        });

        res.status(200).json({
            estado: 'ok',
            mensaje: 'Inicio de sesión exitoso.',
            usuario
        });
    } catch (error) {
        const isValidationError = error.message.includes('proporcionar') ||
            error.message.includes('inválidas');

        const statusCode = isValidationError ? 401 : 500;

        if (!isValidationError) {
            console.error('❌ Error en el login:', error.message);
        }

        res.status(statusCode).json({
            estado: 'error',
            mensaje: error.message
        });
    }
});

/**
 * POST /api/auth/logout
 * Cierra sesión eliminando la cookie de autenticación.
 * Se usa verifyToken de forma opcional para identificar al usuario en la bitácora.
 */
router.post('/logout', verifyToken, async (req, res) => {
    const { cookieOptions } = logout();

    // Registrar en bitácora
    if (req.user) {
        await registrarBitacora({
            id_usuario: req.user.id,
            operacion: 'SALIDA',
            nombre_tabla: 'usuarios',
            id_registro: req.user.id,
            direccion_ip: req.ip
        });
    }

    res.clearCookie('token', cookieOptions);

    res.status(200).json({
        estado: 'ok',
        mensaje: 'Cierre de sesión exitoso.'
    });
});

export default router;
