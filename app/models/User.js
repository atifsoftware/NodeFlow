const Model = require('../core/Model');
const bcrypt = require('bcryptjs');

class User extends Model {
  /**
   * Database table name
   */
  static table = 'users';

  /**
   * Primary key name
   */
  static primaryKey = 'id';

  /**
   * Fields hidden from JSON output
   */
  static hidden = ['password'];

  /**
   * Find a user by their email or username
   * @param {string} identifier 
   * @returns {Promise<object|null>}
   */
  static async findByEmail(identifier) {
    if (!identifier) return null;
    const cleanId = identifier.trim();

    // 1. Direct match on email
    let user = await this.query().where('email', cleanId).first();
    if (user) return user;

    // 2. Direct match on username (if username column exists)
    try {
      user = await this.query().where('username', cleanId).first();
      if (user) return user;
    } catch (e) {
      // Column username might not exist, ignore error
    }

    // 3. If user typed "admin", match email like "admin@%"
    if (!cleanId.includes('@')) {
      user = await this.query().where('email', 'LIKE', `${cleanId}@%`).first();
      if (user) return user;
    }

    return null;
  }

  /**
   * Alias findByUsername to findByEmail
   * @param {string} username 
   * @returns {Promise<object|null>}
   */
  static async findByUsername(username) {
    return await this.findByEmail(username);
  }

  /**
   * Find a user by their ID
   * @param {number} id 
   * @returns {Promise<object|null>}
   */
  static async findById(id) {
    let user = await this.query().where(this.primaryKey, id).first();
    if (user) return user;
    try {
      user = await this.query().where('user_id', id).first();
      if (user) return user;
    } catch (e) {
      // ignore
    }
    return null;
  }

  get(key) {
    if (key === 'id') return this._attributes.id ?? this._attributes.user_id ?? null;
    if (key === 'name') return this._attributes.name ?? this._attributes.full_name ?? null;
    if (key === 'email') return this._attributes.email ?? this._attributes.username ?? null;
    if (key === 'status') return this._attributes.status ?? this._attributes.is_active ?? null;
    return super.get(key);
  }

  set(key, value) {
    if (key === 'id') { this._attributes.id = value; return this; }
    if (key === 'name') { this._attributes.name = value; return this; }
    if (key === 'email') { this._attributes.email = value; return this; }
    if (key === 'status') { this._attributes.status = value; return this; }
    return super.set(key, value);
  }

  /**
   * Create a new user with automatic password hashing
   * @param {object} userData 
   * @returns {Promise<number>} Inserted user's ID
   */
  static async create(userData) {
    const data = { ...userData };
    if (data.password) {
      data.password = this.hashPassword(data.password);
    }
    return await super.create(data);
  }

  /**
   * Update details of an existing user
   */
  static async update(id, userData) {
    const data = { ...userData };
    if (data.password) {
      data.password = this.hashPassword(data.password);
    }
    return await super.update(id, data);
  }

  /**
   * Securely hash a plain text password
   * @param {string} password 
   * @returns {string} Hashed password
   */
  static hashPassword(password) {
    return bcrypt.hashSync(password, 10);
  }

  /**
   * Verify if a plain text password matches a hash
   * @param {string} plain 
   * @param {string} hashed 
   * @returns {boolean} Verified?
   */
  static verifyPassword(plain, hashed) {
    try {
      let normalizedHash = hashed;
      if (hashed && hashed.startsWith('$2y$')) {
        normalizedHash = '$2a$' + hashed.substring(4);
      }
      return bcrypt.compareSync(plain, normalizedHash);
    } catch (e) {
      console.error('Password verification error:', e);
      return false;
    }
  }

  /**
   * HasMany tokens relationship
   */
  tokens() {
    return this.hasMany(require('./PersonalAccessToken'), 'tokenable_id');
  }
}

module.exports = User;
