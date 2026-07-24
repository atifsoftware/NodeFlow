const requestContext = require('./RequestContext');

/**
 * Gate Authorization Registry for NodeFlow
 * Allows defining fine-grained user permissions, modeled after NovaFlow.
 * Automatically resolves the logged-in user from the RequestContext.
 */
class Gate {
  static abilities = new Map();

  /**
   * Define an authorization gate callback
   * @param {string} ability 
   * @param {Function} callback - Function in form (user, ...args) => boolean
   */
  static define(ability, callback) {
    this.abilities.set(ability, callback);
  }

  /**
   * Determine if the currently authenticated user is allowed to perform action
   */
  static allows(ability, ...args) {
    const callback = this.abilities.get(ability);
    if (!callback) {
      return false; // Unauthorized if ability not registered
    }

    // Automatically retrieve the authenticated user from RequestContext
    const store = requestContext.getStore();
    if (!store || !store.req || !store.req.session || !store.req.session.user) {
      return false; // Unauthenticated guest is denied
    }

    const user = store.req.session.user;
    return Boolean(callback(user, ...args));
  }

  /**
   * Determine if the currently authenticated user is denied from performing action
   */
  static denies(ability, ...args) {
    return !this.allows(ability, ...args);
  }
}

// Register default abilities
Gate.define('admin-only', (user) => user.role === 'admin');
Gate.define('user-edit', (user, targetUser) => user.id === (targetUser?.id || targetUser) || user.role === 'admin');

module.exports = Gate;
