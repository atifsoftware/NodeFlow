const express = require('express');
const ApiAuthController = require('../app/controllers/ApiAuthController');
const { auth } = require('../app/middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retrieve active session user profile
 *     description: Fetch profile details and dynamically loaded role permissions of the user logged in through the active browser cookie session.
 *     tags:
 *       - Session Authentication
 *     responses:
 *       200:
 *         description: Profile data retrieved successfully (or null if not logged in).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   nullable: true
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
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["create_user", "edit_user"]
 */
router.get('/me', ApiAuthController.me);

/**
 * @swagger
 * /api/auth/session-login:
 *   post:
 *     summary: Log in via session API
 *     description: Authenticate a user credentials and establish an active Express cookie session.
 *     tags:
 *       - Session Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@nodeflow.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful and session established.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: লগইন সফল হয়েছে।
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
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["create_user", "edit_user"]
 *       400:
 *         description: Bad Request. Email and password are required.
 *       401:
 *         description: Unauthorized. Invalid credentials.
 *       403:
 *         description: Forbidden. Account is inactive.
 */
router.post('/session-login', ApiAuthController.login);

/**
 * @swagger
 * /api/auth/session-logout:
 *   post:
 *     summary: Log out from active session
 *     description: Terminate the user session and clear active cookies.
 *     tags:
 *       - Session Authentication
 *     responses:
 *       200:
 *         description: Logged out successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: লগআউট সফল হয়েছে।
 */
router.post('/session-logout', ApiAuthController.logout);

module.exports = router;
