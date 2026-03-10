import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import env from './env.js';

// Metadata and configuration for Swagger JSDoc
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ISMS API',
            version: '1.0.0',
            description: 'Documentación de la API de ISMS (Inventory & Sales Management System)',
        },
        servers: [
            {
                url: `http://localhost:${env.port || 3000}/api`,
                description: 'Servidor de Desarrollo',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Introduce tu token JWT en el formato: Bearer <token>',
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token',
                    description: 'Token JWT enviado automáticamente desde la cookie',
                }
            },
        },
    },
    // Look for annotations in all router files
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app) => {
    // Configura Swagger UI en la ruta /api-docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'ISMS API Docs'
    }));

    // Endpoint para exponer el JSON
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log('📄 Swagger Docs disponibles en /api-docs');
};
