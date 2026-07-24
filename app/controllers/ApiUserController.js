const User = require('../models/User');
const DB = require('../../config/db');

class ApiUserController {
  /**
   * Fetch all users
   */
  static async index(req, res) {
    try {
      const role = req.user.get('role');
      if (role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Forbidden: Admin access required.' });
      }

      const users = await DB.table('users')
        .select(['id', 'name', 'email', 'role', 'status', 'created_at'])
        .get();

      return res.status(200).json({
        status: 'success',
        data: users
      });
    } catch (err) {
      console.error('Failed to fetch api users:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to fetch users list.' });
    }
  }

  /**
   * Create new user
   */
  static async store(req, res) {
    try {
      const currentRole = req.user.get('role');
      if (currentRole !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Forbidden access.' });
      }

      const { name, email, password, role = 'staff', status = 1 } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ status: 'error', message: 'Name, email, and password are required.' });
      }

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(400).json({ status: 'error', message: 'User with this email already exists.' });
      }

      const newUserId = await User.create({
        name,
        email,
        password,
        role,
        status
      });

      return res.status(201).json({
        status: 'success',
        message: 'User created successfully.',
        user_id: newUserId
      });
    } catch (err) {
      console.error('Failed to create user via API:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'Server error creating user.' });
    }
  }

  /**
   * Update existing user
   */
  static async update(req, res) {
    try {
      const currentRole = req.user.get('role');
      if (currentRole !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Forbidden access.' });
      }

      const targetId = req.params.id;
      const { name, email, password, role, status } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (password && password.trim() !== '') {
        updateData.password = password;
      }

      await User.update(targetId, updateData);

      return res.status(200).json({
        status: 'success',
        message: 'User updated successfully.'
      });
    } catch (err) {
      console.error('Failed to update user via API:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'Server error updating user.' });
    }
  }

  /**
   * Delete user
   */
  static async destroy(req, res) {
    try {
      const currentRole = req.user.get('role');
      if (currentRole !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Forbidden access.' });
      }

      const targetId = req.params.id;
      if (parseInt(targetId) === parseInt(req.user.get('id'))) {
        return res.status(400).json({ status: 'error', message: 'Cannot delete your own account.' });
      }

      await DB.table('users').where('id', targetId).delete();

      return res.status(200).json({
        status: 'success',
        message: 'User deleted successfully.'
      });
    } catch (err) {
      console.error('Failed to delete user via API:', err);
      return res.status(500).json({ status: 'error', message: 'Server error deleting user.' });
    }
  }

  /**
   * Change current user's password
   */
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      if (!current_password || !new_password) {
        return res.status(400).json({ status: 'error', message: 'Both current and new password are required.' });
      }

      const userId = req.user.get('id');
      const user = await User.findById(userId);

      if (!User.verifyPassword(current_password, user.get('password'))) {
        return res.status(400).json({ status: 'error', message: 'Incorrect current password.' });
      }

      await User.update(userId, { password: new_password });

      return res.status(200).json({
        status: 'success',
        message: 'Password changed successfully.'
      });
    } catch (err) {
      console.error('Failed to change password:', err);
      return res.status(500).json({ status: 'error', message: 'Server error changing password.' });
    }
  }
}

module.exports = ApiUserController;
