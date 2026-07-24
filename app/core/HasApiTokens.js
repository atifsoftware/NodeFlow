const DB = require('../../config/db');
const crypto = require('crypto');

/**
 * Personal Access Token Manager for NodeFlow
 * Models Sanctum token workflows for API authorization.
 */
class HasApiTokens {
  static table = 'personal_access_tokens';

  /**
   * Generate and store a new personal access token for a user
   * @param {Model} userInstance 
   * @param {string} name 
   * @param {string[]} abilities 
   * @returns {Promise<{plainTextToken: string, token: string}>}
   */
  static async createToken(userInstance, name, abilities = ['*']) {
    const plainToken = 'nf_pat_' + crypto.randomBytes(30).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const pk = userInstance.constructor.primaryKey || 'id';

    console.log("[DEBUG createToken] userInstance:", userInstance);
    console.log("[DEBUG createToken] pk:", pk);
    console.log("[DEBUG createToken] tokenable_id value:", userInstance.get(pk));

    await DB.table(this.table).insert({
      tokenable_type: 'User',
      tokenable_id: userInstance.get(pk),
      name,
      token: hashedToken,
      abilities: JSON.stringify(abilities),
      created_at: now
    });

    return {
      plainTextToken: plainToken,
      token: hashedToken
    };
  }

  /**
   * Get all active tokens for a user
   */
  static async tokens(userInstance) {
    const pk = userInstance.constructor.primaryKey || 'id';
    return await DB.table(this.table)
      .where('tokenable_id', userInstance.get(pk))
      .get();
  }

  /**
   * Revoke a token by ID or plain-text token
   */
  static async revokeToken(userInstance, idOrToken) {
    const pk = userInstance.constructor.primaryKey || 'id';
    const q = DB.table(this.table).where('tokenable_id', userInstance.get(pk));
    
    if (typeof idOrToken === 'number') {
      return await q.where('id', idOrToken).delete();
    } else {
      const hashed = crypto.createHash('sha256').update(idOrToken).digest('hex');
      return await q.where('token', hashed).delete();
    }
  }
}

module.exports = HasApiTokens;
