import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

const app = express();

// ─── Middlewares de Seguridad ─────────────────────
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));

// ─── Parseo del Body y Cookies ─────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logger HTTP ──────────────────────────────────
app.use(morgan('dev'));

// ─── Rutas ────────────────────────────────────────
app.use('/api', routes);

// ─── Manejo de Errores ────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
