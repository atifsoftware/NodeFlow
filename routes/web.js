const express = require('express');
const router = express.Router();
const HomeController = require('../app/controllers/HomeController');
const AuthController = require('../app/controllers/AuthController');
const UserController = require('../app/controllers/UserController');
const SettingController = require('../app/controllers/SettingController');
const { auth, guest, can } = require('../app/middlewares/auth');

// Public routes
router.get('/', HomeController.index);
router.get('/docs', HomeController.docs);

// Guest authentication routes
router.get('/login', guest, AuthController.showLogin);
router.post('/login', guest, AuthController.login);

// Authenticated administrative routes
router.get('/logout', auth, AuthController.logout);
router.get('/admin/dashboard', auth, HomeController.adminDashboard);

// Settings routes
router.get('/admin/settings', auth, SettingController.index);
router.post('/admin/settings', auth, SettingController.update);

// User Management administrative routes
router.get('/admin/users', auth, can('manage-users'), UserController.index);
router.post('/admin/users', auth, can('manage-users'), UserController.store);
router.put('/admin/users/:id', auth, can('manage-users'), UserController.update);
router.delete('/admin/users/:id', auth, can('manage-users'), UserController.destroy);

module.exports = router;
