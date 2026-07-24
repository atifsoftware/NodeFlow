const express = require('express');
const router = express.Router();
const apiTokenAuth = require('../app/middlewares/apiTokenAuth');
const apiCan = require('../app/middlewares/apiCan');
const ApiAuthController = require('../app/controllers/ApiAuthController');
const ApiUserController = require('../app/controllers/ApiUserController');

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get API server status
 *     description: Retrieve system status, message, and current server time.
 *     tags:
 *       - System Status
 *     responses:
 *       200:
 *         description: Server is online and operating correctly.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: NodeFlow API Server is running successfully.
 *                 timestamp:
 *                   type: string
 *                   example: 2026-06-15T15:30:22.299Z
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'success',
    message: 'NodeFlow API Server is running successfully.',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/settings
 * Fetch public site settings map
 */
router.get('/settings', (req, res) => {
  res.json({
    status: 'success',
    settings: global.cachedSettingsMap || {}
  });
});

/**
 * POST /api/login
 * Issue a Personal Access Token for authentication
 */
router.post('/login', ApiAuthController.issueToken);

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Retrieve authorized user profile
 *     description: Fetch profile details and permission abilities of the currently authorized client token.
 *     tags:
 *       - Profile Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: Admin
 *                     email:
 *                       type: string
 *                       example: admin@nodeflow.com
 *                     role:
 *                       type: string
 *                       example: admin
 *                 abilities:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["manage-users", "view-logs"]
 *       401:
 *         description: Unauthorized. Missing or invalid Bearer token.
 */
router.get('/user', apiTokenAuth, (req, res) => {
  let permissions = [];
  const rawPerms = req.user.get('permissions');
  if (rawPerms) {
    try {
      permissions = JSON.parse(rawPerms);
    } catch (e) {
      console.error('Failed to parse user permissions:', e);
    }
  }
  res.json({
    status: 'success',
    user: {
      id: req.user.get('id'),
      name: req.user.get('name'),
      email: req.user.get('email'),
      role: req.user.get('role'),
      permissions: permissions
    },
    abilities: req.tokenAbilities
  });
});

// User Management APIs
router.get('/users', apiTokenAuth, apiCan('manage-users'), ApiUserController.index);
router.post('/users', apiTokenAuth, apiCan('manage-users'), ApiUserController.store);
router.put('/users/:id', apiTokenAuth, apiCan('manage-users'), ApiUserController.update);
router.delete('/users/:id', apiTokenAuth, apiCan('manage-users'), ApiUserController.destroy);

module.exports = router;
