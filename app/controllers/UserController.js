const User = require('../models/User');
const Pagination = require('../core/Pagination');
const Gate = require('../core/Gate');
const DB = require('../../config/db');

class UserController {
  /**
   * Display a listing of the users
   */
  static async index(req, res, next) {
    try {
      if (!Gate.allows('admin-only')) {
        if (global.Flash) Flash.error('আপনার এই পেজটি অ্যাক্সেস করার অনুমতি নেই।');
        return res.redirect('/admin/dashboard');
      }

      const currentPage = parseInt(req.query.page) || 1;
      const perPage = 10;
      const search = req.query.search || '';

      // Initialize base queries for stats
      const totalCount = await User.query().count();
      const activeCount = await User.query().where('status', 1).count();
      const suspendedCount = await User.query().where('status', 0).count();
      const adminCount = await User.query().where('role', 'admin').count();

      const stats = {
        total: totalCount,
        active: activeCount,
        suspended: suspendedCount,
        admins: adminCount
      };

      // Build search query builder
      let queryBuilder = User.query();
      if (search.trim().length > 0) {
        queryBuilder = queryBuilder.where(q => {
          q.where('name', 'LIKE', `%${search}%`)
           .orWhere('email', 'LIKE', `%${search}%`);
        });
      }

      const matchCount = await queryBuilder.count();
      const pagination = Pagination.make(
        matchCount,
        perPage,
        currentPage,
        `/admin/users${search ? '?search=' + encodeURIComponent(search) : ''}`
      );
      const offset = pagination.offset();

      const users = await queryBuilder
        .orderBy('id', 'DESC')
        .limit(perPage)
        .offset(offset)
        .get();

      res.render('admin/users/index', {
        title: 'ব্যবহারকারী ব্যবস্থাপনা — NodeFlow Admin',
        users,
        paginationHtml: pagination.render(),
        stats,
        search,
        user: req.session.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a new user into the database
   */
  static async store(req, res) {
    try {
      if (!Gate.allows('admin-only')) {
        return res.status(403).json({ status: 'error', message: 'Forbidden access.' });
      }

      const { name, email, password, role, status } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ status: 'error', message: 'সবগুলো প্রয়োজনীয় তথ্য পূরণ করুন।' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ status: 'error', message: `এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে।` });
      }

      await User.create({
        name,
        email,
        password,
        role,
        status: parseInt(status) === 1 ? 1 : 0
      });

      res.status(201).json({ status: 'success', message: 'ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে।' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  /**
   * Update details of an existing user
   */
  static async update(req, res) {
    try {
      if (!Gate.allows('admin-only')) {
        return res.status(403).json({ status: 'error', message: 'Forbidden access.' });
      }

      const { id } = req.params;
      const { name, email, password, role, status } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ status: 'error', message: 'সবগুলো প্রয়োজনীয় তথ্য পূরণ করুন।' });
      }

      const targetUser = await User.find(id);
      if (!targetUser) {
        return res.status(404).json({ status: 'error', message: 'ব্যবহারকারী পাওয়া যায়নি।' });
      }

      const emailCheck = await User.findByEmail(email);
      if (emailCheck && emailCheck.get('id') !== parseInt(id)) {
        return res.status(400).json({ status: 'error', message: `ইমেইলটি অন্য একজন ব্যবহারকারী ব্যবহার করছেন।` });
      }

      const updateData = {
        name,
        email,
        role,
        status: parseInt(status) === 1 ? 1 : 0
      };

      if (password && password.trim().length > 0) {
        updateData.password = password;
      }

      await User.update(id, updateData);

      if (parseInt(id) === req.session.user.id) {
        req.session.user.name = name;
        req.session.user.email = email;
        req.session.user.role = role;
        req.session.save();
      }

      res.json({ status: 'success', message: 'ব্যবহারকারীর তথ্য সফলভাবে হালনাগাদ করা হয়েছে।' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  /**
   * Safely delete a user record
   */
  static async destroy(req, res) {
    try {
      if (!Gate.allows('admin-only')) {
        return res.status(403).json({ status: 'error', message: 'Forbidden access.' });
      }

      const { id } = req.params;

      if (parseInt(id) === req.session.user.id) {
        return res.status(400).json({ status: 'error', message: 'আপনি নিজের অ্যাকাউন্টটি ডিলিট করতে পারবেন না।' });
      }

      const targetUser = await User.find(id);
      if (!targetUser) {
        return res.status(404).json({ status: 'error', message: 'ব্যবহারকারী পাওয়া যায়নি।' });
      }

      await User.destroy(id);

      res.json({ status: 'success', message: 'ব্যবহারকারী সফলভাবে ডিলিট করা হয়েছে।' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = UserController;
