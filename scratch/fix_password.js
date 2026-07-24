const DB = require('../config/db');
const bcrypt = require('bcryptjs');

async function fixAdminPassword() {
  try {
    const hash = bcrypt.hashSync('admin123', 10);
    const result = await DB.query('UPDATE users SET password = ? WHERE email = ?', [hash, 'admin@nodeflow.com']);
    console.log('Successfully updated password hash for admin@nodeflow.com:', hash);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    process.exit(0);
  }
}

fixAdminPassword();
