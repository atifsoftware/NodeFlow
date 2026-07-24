const Model = require('../core/Model');

/**
 * PersonalAccessToken Model for NodeFlow
 * Manages API authorization tokens.
 */
class PersonalAccessToken extends Model {
  static table = 'personal_access_tokens';
}

module.exports = PersonalAccessToken;
