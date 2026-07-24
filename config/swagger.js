const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Metadata options for OpenAPI spec
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NodeFlow MVC Core API Docs',
      version: '1.0.0',
      description: 'Interactive RESTful API Explorer for NodeFlow, modeled after FastAPI docs. Test endpoints in real-time by authorizing with a JWT or Personal Access Token.',
      contact: {
        name: 'NodeFlow Core Team'
      }
    },
    servers: [
      {
        url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT/Token',
          description: 'Input your Bearer JWT token or personal access token to authorize protected API endpoints.'
        }
      }
    }
  },
  // Files to scan for JSDoc documentation comments
  apis: ['./app/controllers/*.js', './routes/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec
};
