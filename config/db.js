const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool using environmental variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'pharmacy_erp_db_online',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Fluent Query Builder Class
 */
class QueryBuilder {
  constructor(table, connection = null) {
    this._table = table;
    this._connection = connection;
    this._select = '*';
    this._wheres = []; // Elements: { boolean: 'AND'|'OR', sql: string, bindings: Array }
    this._joins = [];
    this._orders = [];
    this._limit = null;
    this._offset = null;
    this._groupBy = null;
    this._having = null;
    this._havingBindings = [];
  }

  select(fields, ...more) {
    if (more.length > 0) {
      this._select = [fields, ...more].join(', ');
    } else {
      this._select = Array.isArray(fields) ? fields.join(', ') : fields;
    }
    return this;
  }

  _parseTableName(table) {
    let tableName = table;
    let alias = '';
    if (tableName.toLowerCase().includes(' as ')) {
      const parts = tableName.split(/ as /i);
      tableName = parts[0].trim();
      alias = ` AS \`${parts[1].trim()}\``;
    }
    const escTable = tableName.includes('.') ? tableName.split('.').map(t => `\`${t}\``).join('.') : `\`${tableName}\``;
    return `${escTable}${alias}`;
  }

  // Internal helper to register a where clause block
  _addWhere(boolean, sql, bindings = []) {
    this._wheres.push({ boolean, sql, bindings });
    return this;
  }

  where(column, operator, value) {
    if (typeof column === 'function') {
      const nested = new QueryBuilder(this._table, this._connection);
      column(nested);
      if (nested._wheres.length > 0) {
        const { sql, bindings } = nested._compileWheres();
        this._addWhere('AND', `(${sql})`, bindings);
      }
      return this;
    }

    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._addWhere('AND', `${colName} ${operator} ?`, [value]);
    return this;
  }

  orWhere(column, operator, value) {
    if (typeof column === 'function') {
      const nested = new QueryBuilder(this._table, this._connection);
      column(nested);
      if (nested._wheres.length > 0) {
        const { sql, bindings } = nested._compileWheres();
        this._addWhere('OR', `(${sql})`, bindings);
      }
      return this;
    }

    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._addWhere('OR', `${colName} ${operator} ?`, [value]);
    return this;
  }

  whereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) return this;
    const placeholders = values.map(() => '?').join(', ');
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._addWhere('AND', `${colName} IN (${placeholders})`, values);
    return this;
  }

  whereNotIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) return this;
    const placeholders = values.map(() => '?').join(', ');
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._addWhere('AND', `${colName} NOT IN (${placeholders})`, values);
    return this;
  }

  whereNull(column) {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._addWhere('AND', `${colName} IS NULL`, []);
    return this;
  }

  whereNotNull(column) {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._addWhere('AND', `${colName} IS NOT NULL`, []);
    return this;
  }

  whereBetween(column, range) {
    if (!Array.isArray(range) || range.length !== 2) return this;
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._addWhere('AND', `${colName} BETWEEN ? AND ?`, range);
    return this;
  }

  whereLike(column, value) {
    return this.where(column, 'LIKE', value);
  }

  orWhereLike(column, value) {
    return this.orWhere(column, 'LIKE', value);
  }

  whereRaw(sql, bindings = []) {
    this._addWhere('AND', sql, bindings);
    return this;
  }

  join(table, first, operator, second, type = 'INNER') {
    const escTable = this._parseTableName(table);
    if (operator === undefined && second === undefined) {
      this._joins.push(`${type} JOIN ${escTable} ON ${first}`);
    } else {
      const escFirst = first.includes('.') ? first.split('.').map(c => `\`${c}\``).join('.') : `\`${first}\``;
      const escSecond = second.includes('.') ? second.split('.').map(c => `\`${c}\``).join('.') : `\`${second}\``;
      this._joins.push(`${type} JOIN ${escTable} ON ${escFirst} ${operator} ${escSecond}`);
    }
    return this;
  }

  leftJoin(table, first, operator, second) {
    return this.join(table, first, operator, second, 'LEFT');
  }

  rightJoin(table, first, operator, second) {
    return this.join(table, first, operator, second, 'RIGHT');
  }

  groupBy(column) {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._groupBy = `GROUP BY ${colName}`;
    return this;
  }

  having(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._having = `HAVING ${colName} ${operator} ?`;
    this._havingBindings = [value];
    return this;
  }

  orderBy(column, direction = 'ASC') {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    this._orders.push(`${colName} ${direction.toUpperCase()}`);
    return this;
  }

  limit(count) {
    this._limit = parseInt(count);
    return this;
  }

  offset(count) {
    this._offset = parseInt(count);
    return this;
  }

  when(condition, callback, defaultCallback = null) {
    if (condition) {
      callback(this, condition);
    } else if (defaultCallback) {
      defaultCallback(this, condition);
    }
    return this;
  }

  // Internal helper to compile wheres into query syntax
  _compileWheres() {
    if (this._wheres.length === 0) {
      return { sql: '', bindings: [] };
    }
    let sql = '';
    const bindings = [];
    this._wheres.forEach((w, idx) => {
      if (idx === 0) {
        sql += w.sql;
      } else {
        sql += ` ${w.boolean} ${w.sql}`;
      }
      bindings.push(...w.bindings);
    });
    return { sql, bindings };
  }

  toSql() {
    const escTable = this._parseTableName(this._table);
    let sql = `SELECT ${this._select} FROM ${escTable}`;

    if (this._joins.length > 0) {
      sql += ` ${this._joins.join(' ')}`;
    }

    const { sql: whereSql } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    if (this._groupBy) {
      sql += ` ${this._groupBy}`;
    }

    if (this._having) {
      sql += ` ${this._having}`;
    }

    if (this._orders.length > 0) {
      sql += ` ORDER BY ${this._orders.join(', ')}`;
    }

    if (this._limit !== null) {
      sql += ` LIMIT ${this._limit}`;
      if (this._offset !== null) {
        sql += ` OFFSET ${this._offset}`;
      }
    }

    return sql;
  }

  getBindings() {
    const { bindings } = this._compileWheres();
    return [...bindings, ...this._havingBindings];
  }

  /**
   * Helper to execute queries on standard pool or explicit transaction connection
   */
  async _query(sql, bindings = []) {
    const executor = this._connection || pool;
    const [rows] = await executor.query(sql, bindings);
    return rows;
  }

  async get() {
    const sql = this.toSql();
    const bindings = this.getBindings();
    return await this._query(sql, bindings);
  }

  async first() {
    this.limit(1);
    const sql = this.toSql();
    const bindings = this.getBindings();
    const rows = await this._query(sql, bindings);
    return rows.length > 0 ? rows[0] : null;
  }

  async insert(data) {
    const keys = Object.keys(data);
    const escapedKeys = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${this._table}\` (${escapedKeys}) VALUES (${placeholders})`;
    const values = Object.values(data);

    const executor = this._connection || pool;
    const [result] = await executor.query(sql, values);
    return result.insertId;
  }

  async update(data) {
    const keys = Object.keys(data);
    const setClause = keys.map(key => `\`${key}\` = ?`).join(', ');
    let sql = `UPDATE \`${this._table}\` SET ${setClause}`;
    const values = Object.values(data);

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const executor = this._connection || pool;
    const [result] = await executor.query(sql, [...values, ...whereBindings]);
    return result.affectedRows;
  }

  async delete() {
    let sql = `DELETE FROM \`${this._table}\``;

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const executor = this._connection || pool;
    const [result] = await executor.query(sql, whereBindings);
    return result.affectedRows;
  }

  async count() {
    const escTable = this._parseTableName(this._table);
    let sql = `SELECT COUNT(*) AS total FROM ${escTable}`;

    if (this._joins.length > 0) {
      sql += ` ${this._joins.join(' ')}`;
    }

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const rows = await this._query(sql, whereBindings);
    return rows[0].total;
  }

  async sum(column) {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    const escTable = this._parseTableName(this._table);
    let sql = `SELECT SUM(${colName}) AS aggregate FROM ${escTable}`;

    if (this._joins.length > 0) {
      sql += ` ${this._joins.join(' ')}`;
    }

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const rows = await this._query(sql, whereBindings);
    return Number(rows[0].aggregate || 0);
  }

  async avg(column) {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    const escTable = this._parseTableName(this._table);
    let sql = `SELECT AVG(${colName}) AS aggregate FROM ${escTable}`;

    if (this._joins.length > 0) {
      sql += ` ${this._joins.join(' ')}`;
    }

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const rows = await this._query(sql, whereBindings);
    return Number(rows[0].aggregate || 0);
  }

  async increment(column, amount = 1) {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    let sql = `UPDATE \`${this._table}\` SET ${colName} = ${colName} + ?`;

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const executor = this._connection || pool;
    const [result] = await executor.query(sql, [amount, ...whereBindings]);
    return result.affectedRows;
  }

  async decrement(column, amount = 1) {
    const colName = column.includes('.') ? column.split('.').map(c => `\`${c}\``).join('.') : `\`${column}\``;
    let sql = `UPDATE \`${this._table}\` SET ${colName} = ${colName} - ?`;

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const executor = this._connection || pool;
    const [result] = await executor.query(sql, [amount, ...whereBindings]);
    return result.affectedRows;
  }
}

/**
 * Main Database Core Wrapper
 */
const DB = {
  pool,
  query: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  getConnection: async () => {
    return await pool.getConnection();
  },
  table: (name, connection = null) => {
    return new QueryBuilder(name, connection);
  },
  beginTransaction: async () => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
  },
  transaction: async (callback) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const transactionDB = {
        query: async (sql, params = []) => {
          return await connection.query(sql, params);
        },
        table: (name) => {
          return new QueryBuilder(name, connection);
        }
      };

      const result = await callback(transactionDB);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
};

module.exports = DB;
