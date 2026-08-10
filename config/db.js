const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool using environmental variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'nodeflow_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Query logger state
let isQueryLogging = false;
let queryLogs = [];
let slowQueryThresholdMs = 0;
let slowQueryHandler = null;

// Query Events listeners
let queryEventListeners = {
  querying: [],
  queried: [],
  error: []
};

// Cache Manager (optional Redis integration)
let cacheManager = null;
try {
  const Cache = require('../app/core/Cache');
  cacheManager = Cache;
} catch (e) {
  // Cache not available, will use memory-only fallback
}

// Whitelist of valid comparison operators to prevent SQL injection
const VALID_OPERATORS = [
  '=', '<', '>', '<=', '>=', '<>', '!=', '<=>',
  'like', 'not like', 'in', 'not in', 'regexp', 'not regexp', 'rlike', 'is', 'is not'
];

/**
 * Fluent Query Builder Class for NodeFlow
 */
class QueryBuilder {
  static macros = {};

  constructor(table, connection = null) {
    this._table = table;
    this._connection = connection;
    this._select = '*';
    this._selectExpressions = [];
    this._distinct = false;
    this._wheres = []; // Elements: { boolean: 'AND'|'OR', sql: string, bindings: Array }
    this._joins = [];
    this._orders = [];
    this._limit = null;
    this._offset = null;
    this._groupBy = [];
    this._havings = [];
    this._havingBindings = [];
    this._lock = '';
    this._tableAlias = '';
    this._subqueryTable = null;
    this._cacheTtl = null; // Cache TTL in seconds
    this._useCache = false; // Enable query caching
    this._cacheKey = null; // Custom cache key
  }

  /**
   * Register a custom macro method on QueryBuilder
   */
  static macro(name, callback) {
    QueryBuilder.macros[name] = callback;
    QueryBuilder.prototype[name] = function (...args) {
      return callback.apply(this, args);
    };
  }

  /**
   * Clone the current QueryBuilder instance for safe re-use without mutation
   */
  clone() {
    const qb = new QueryBuilder(this._table, this._connection);
    qb._select = this._select;
    qb._selectExpressions = [...this._selectExpressions];
    qb._distinct = this._distinct;
    qb._wheres = this._wheres.map(w => ({ ...w, bindings: [...w.bindings] }));
    qb._joins = [...this._joins];
    qb._orders = [...this._orders];
    qb._limit = this._limit;
    qb._offset = this._offset;
    qb._groupBy = [...this._groupBy];
    qb._havings = this._havings.map(h => ({ ...h, bindings: [...h.bindings] }));
    qb._havingBindings = [...this._havingBindings];
    qb._lock = this._lock;
    qb._tableAlias = this._tableAlias;
    qb._subqueryTable = this._subqueryTable ? { ...this._subqueryTable } : null;
    qb._cacheTtl = this._cacheTtl;
    qb._useCache = this._useCache;
    qb._cacheKey = this._cacheKey;
    return qb;
  }

  /**
   * Validate comparison operator
   */
  _validateOperator(op) {
    const strOp = String(op).trim().toLowerCase();
    if (!VALID_OPERATORS.includes(strOp)) {
      throw new Error(`Invalid SQL operator: '${op}'.`);
    }
    return strOp.toUpperCase();
  }

  /**
   * Safe column name escaper
   */
  _escapeColumn(column) {
    if (!column || column === '*') return '*';
    if (typeof column !== 'string') return column;

    // Handle RAW or expression with parentheses e.g. COUNT(*), DATE(created_at)
    if (column.includes('(') || column.includes(')')) {
      return column;
    }

    // Handle aliases e.g. "users.id as user_id"
    if (column.toLowerCase().includes(' as ')) {
      const parts = column.split(/ as /i);
      return `${this._escapeColumn(parts[0].trim())} AS \`${parts[1].trim().replace(/`/g, '')}\``;
    }

    // Handle dot notation e.g. "users.name"
    if (column.includes('.')) {
      return column.split('.').map(c => c === '*' ? '*' : `\`${c.replace(/`/g, '')}\``).join('.');
    }

    return `\`${column.replace(/`/g, '')}\``;
  }

  /**
   * Safe table name parser
   */
  _parseTableName(table) {
    if (!table) return '';
    let tableName = table;
    let alias = '';
    if (tableName.toLowerCase().includes(' as ')) {
      const parts = tableName.split(/ as /i);
      tableName = parts[0].trim();
      alias = ` AS \`${parts[1].trim().replace(/`/g, '')}\``;
    }
    const escTable = tableName.includes('.') 
      ? tableName.split('.').map(t => `\`${t.replace(/`/g, '')}\``).join('.') 
      : `\`${tableName.replace(/`/g, '')}\``;
    return `${escTable}${alias}`;
  }

  // Internal helper to register a where clause block
  _addWhere(boolean, sql, bindings = []) {
    this._wheres.push({ boolean: boolean.toUpperCase(), sql, bindings });
    return this;
  }

  /**
   * Helper to resolve subquery callback or QueryBuilder instance
   */
  _resolveSubquery(subqueryOrCb) {
    if (typeof subqueryOrCb === 'function') {
      const nested = new QueryBuilder(null, this._connection);
      subqueryOrCb(nested);
      return nested;
    } else if (subqueryOrCb instanceof QueryBuilder) {
      return subqueryOrCb;
    }
    throw new Error("Subquery must be a QueryBuilder instance or a closure callback.");
  }

  /**
   * Set target table name
   */
  from(table) {
    this._table = table;
    return this;
  }

  table(table) {
    this._table = table;
    return this;
  }

  select(fields, ...more) {
    if (more.length > 0) {
      this._select = [fields, ...more].map(f => this._escapeColumn(f)).join(', ');
    } else if (Array.isArray(fields)) {
      this._select = fields.map(f => this._escapeColumn(f)).join(', ');
    } else {
      this._select = fields === '*' ? '*' : this._escapeColumn(fields);
    }
    return this;
  }

  selectRaw(sql, bindings = []) {
    this._select = sql;
    if (bindings.length > 0) {
      this._selectExpressions.push({ sql, bindings });
    }
    return this;
  }

  /**
   * Add a subquery to select clause
   * @param {Function|QueryBuilder} subquery 
   * @param {string} alias 
   */
  selectSub(subquery, alias) {
    const nested = this._resolveSubquery(subquery);
    const subSql = `(${nested.toSql()}) AS \`${alias.replace(/`/g, '')}\``;
    
    if (this._select === '*' || !this._select) {
      const escTable = this._parseTableName(this._table);
      const tableWildcard = escTable ? `${escTable}.*` : '*';
      this._select = `${tableWildcard}, ${subSql}`;
    } else {
      this._select += `, ${subSql}`;
    }
    
    this._selectExpressions.push({ sql: subSql, bindings: nested.getBindings() });
    return this;
  }

  /**
   * Query from a derived subquery table
   * @param {Function|QueryBuilder} subquery 
   * @param {string} alias 
   */
  fromSub(subquery, alias) {
    const nested = this._resolveSubquery(subquery);
    this._subqueryTable = {
      sql: `(${nested.toSql()}) AS \`${alias.replace(/`/g, '')}\``,
      bindings: nested.getBindings()
    };
    return this;
  }

  distinct() {
    this._distinct = true;
    return this;
  }

  where(column, operator, value) {
    // 1. Support object syntax: .where({ status: 'active', role: 'admin' })
    if (column && typeof column === 'object' && !Array.isArray(column) && typeof column !== 'function' && !(column instanceof QueryBuilder)) {
      for (const [k, v] of Object.entries(column)) {
        if (v === null) {
          this.whereNull(k);
        } else {
          this.where(k, '=', v);
        }
      }
      return this;
    }

    // 2. Support nested sub-clause callback: .where(qb => qb.where(...).orWhere(...))
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

    if (value === null && operator === '=') {
      return this.whereNull(column);
    }

    const validOp = this._validateOperator(operator);
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} ${validOp} ?`, [value]);
    return this;
  }

  orWhere(column, operator, value) {
    if (column && typeof column === 'object' && !Array.isArray(column) && typeof column !== 'function') {
      for (const [k, v] of Object.entries(column)) {
        if (v === null) {
          this.orWhereNull(k);
        } else {
          this.orWhere(k, '=', v);
        }
      }
      return this;
    }

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

    if (value === null && operator === '=') {
      return this.orWhereNull(column);
    }

    const validOp = this._validateOperator(operator);
    const colName = this._escapeColumn(column);
    this._addWhere('OR', `${colName} ${validOp} ?`, [value]);
    return this;
  }

  /**
   * Match ANY condition among an array of column conditions: .whereAny([['name', 'LIKE', '%a%'], ['email', 'LIKE', '%a%']])
   */
  whereAny(conditions) {
    return this.where(nested => {
      conditions.forEach(([col, op, val], idx) => {
        if (idx === 0) {
          nested.where(col, op, val);
        } else {
          nested.orWhere(col, op, val);
        }
      });
    });
  }

  /**
   * Match ALL conditions in nested block
   */
  whereAll(conditions) {
    return this.where(nested => {
      conditions.forEach(([col, op, val]) => {
        nested.where(col, op, val);
      });
    });
  }

  whereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this._addWhere('AND', '1 = 0', []);
    }
    const placeholders = values.map(() => '?').join(', ');
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} IN (${placeholders})`, values);
    return this;
  }

  orWhereIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this._addWhere('OR', '1 = 0', []);
    }
    const placeholders = values.map(() => '?').join(', ');
    const colName = this._escapeColumn(column);
    this._addWhere('OR', `${colName} IN (${placeholders})`, values);
    return this;
  }

  whereNotIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this._addWhere('AND', '1 = 1', []);
    }
    const placeholders = values.map(() => '?').join(', ');
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} NOT IN (${placeholders})`, values);
    return this;
  }

  orWhereNotIn(column, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this._addWhere('OR', '1 = 1', []);
    }
    const placeholders = values.map(() => '?').join(', ');
    const colName = this._escapeColumn(column);
    this._addWhere('OR', `${colName} NOT IN (${placeholders})`, values);
    return this;
  }

  /**
   * Where In Subquery
   */
  whereInSub(column, subquery) {
    const nested = this._resolveSubquery(subquery);
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} IN (${nested.toSql()})`, nested.getBindings());
    return this;
  }

  orWhereInSub(column, subquery) {
    const nested = this._resolveSubquery(subquery);
    const colName = this._escapeColumn(column);
    this._addWhere('OR', `${colName} IN (${nested.toSql()})`, nested.getBindings());
    return this;
  }

  whereNotInSub(column, subquery) {
    const nested = this._resolveSubquery(subquery);
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} NOT IN (${nested.toSql()})`, nested.getBindings());
    return this;
  }

  orWhereNotInSub(column, subquery) {
    const nested = this._resolveSubquery(subquery);
    const colName = this._escapeColumn(column);
    this._addWhere('OR', `${colName} NOT IN (${nested.toSql()})`, nested.getBindings());
    return this;
  }

  whereNull(column) {
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} IS NULL`, []);
    return this;
  }

  orWhereNull(column) {
    const colName = this._escapeColumn(column);
    this._addWhere('OR', `${colName} IS NULL`, []);
    return this;
  }

  whereNotNull(column) {
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} IS NOT NULL`, []);
    return this;
  }

  orWhereNotNull(column) {
    const colName = this._escapeColumn(column);
    this._addWhere('OR', `${colName} IS NOT NULL`, []);
    return this;
  }

  whereBetween(column, range) {
    if (!Array.isArray(range) || range.length !== 2) return this;
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} BETWEEN ? AND ?`, range);
    return this;
  }

  whereNotBetween(column, range) {
    if (!Array.isArray(range) || range.length !== 2) return this;
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `${colName} NOT BETWEEN ? AND ?`, range);
    return this;
  }

  whereBetweenColumns(column, [col1, col2]) {
    const colName = this._escapeColumn(column);
    const colFirst = this._escapeColumn(col1);
    const colSecond = this._escapeColumn(col2);
    this._addWhere('AND', `${colName} BETWEEN ${colFirst} AND ${colSecond}`, []);
    return this;
  }

  whereColumn(first, operator, second) {
    if (second === undefined) {
      second = operator;
      operator = '=';
    }
    const validOp = this._validateOperator(operator);
    const colFirst = this._escapeColumn(first);
    const colSecond = this._escapeColumn(second);
    this._addWhere('AND', `${colFirst} ${validOp} ${colSecond}`, []);
    return this;
  }

  whereExists(callback) {
    const nested = this._resolveSubquery(callback);
    this._addWhere('AND', `EXISTS (${nested.toSql()})`, nested.getBindings());
    return this;
  }

  whereNotExists(callback) {
    const nested = this._resolveSubquery(callback);
    this._addWhere('AND', `NOT EXISTS (${nested.toSql()})`, nested.getBindings());
    return this;
  }

  /**
   * MySQL JSON Contains query: .whereJsonContains('settings->theme', 'dark')
   */
  whereJsonContains(column, value, path = '$') {
    const colName = this._escapeColumn(column);
    const jsonVal = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
    this._addWhere('AND', `JSON_CONTAINS(${colName}, ?, ?)`, [jsonVal, path]);
    return this;
  }

  orWhereJsonContains(column, value, path = '$') {
    const colName = this._escapeColumn(column);
    const jsonVal = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
    this._addWhere('OR', `JSON_CONTAINS(${colName}, ?, ?)`, [jsonVal, path]);
    return this;
  }

  whereDate(column, date) {
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `DATE(${colName}) = ?`, [date]);
    return this;
  }

  whereYear(column, year) {
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `YEAR(${colName}) = ?`, [year]);
    return this;
  }

  whereMonth(column, month) {
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `MONTH(${colName}) = ?`, [month]);
    return this;
  }

  whereDay(column, day) {
    const colName = this._escapeColumn(column);
    this._addWhere('AND', `DAY(${colName}) = ?`, [day]);
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

  orWhereRaw(sql, bindings = []) {
    this._addWhere('OR', sql, bindings);
    return this;
  }

  /**
   * Enable query caching with optional TTL and custom key
   * @param {number} ttl - Cache time-to-live in seconds (default: 3600)
   * @param {string|null} key - Custom cache key (auto-generated if null)
   */
  cache(ttl = 3600, key = null) {
    this._useCache = true;
    this._cacheTtl = ttl;
    this._cacheKey = key;
    return this;
  }

  /**
   * Disable query caching
   */
  withoutCache() {
    this._useCache = false;
    this._cacheTtl = null;
    this._cacheKey = null;
    return this;
  }

  /**
   * Generate cache key from query SQL and bindings
   */
  _generateCacheKey() {
    if (this._cacheKey) {
      return `query:${this._cacheKey}`;
    }
    const sql = this.toSql();
    const bindings = JSON.stringify(this.getBindings());
    const hash = require('crypto').createHash('md5').update(sql + bindings).digest('hex');
    return `query:${hash}`;
  }

  /**
   * Register query event listener
   */
  static on(event, callback) {
    if (!queryEventListeners[event]) {
      throw new Error(`Invalid query event: ${event}. Valid events: querying, queried, error`);
    }
    queryEventListeners[event].push(callback);
  }

  /**
   * Fire query event
   */
  async _fireEvent(event, data) {
    const listeners = queryEventListeners[event] || [];
    for (const callback of listeners) {
      await callback(data);
    }
  }

  join(table, first, operator, second, type = 'INNER') {
    const escTable = this._parseTableName(table);
    if (typeof first === 'function') {
      const joinBuilder = new QueryBuilder(null, this._connection);
      first(joinBuilder);
      const { sql: onSql, bindings: onBindings } = joinBuilder._compileWheres();
      this._joins.push(`${type} JOIN ${escTable} ON ${onSql}`);
      this._havingBindings.push(...onBindings);
    } else if (operator === undefined && second === undefined) {
      this._joins.push(`${type} JOIN ${escTable} ON ${first}`);
    } else {
      const validOp = this._validateOperator(operator);
      const escFirst = this._escapeColumn(first);
      const escSecond = this._escapeColumn(second);
      this._joins.push(`${type} JOIN ${escTable} ON ${escFirst} ${validOp} ${escSecond}`);
    }
    return this;
  }

  leftJoin(table, first, operator, second) {
    return this.join(table, first, operator, second, 'LEFT');
  }

  rightJoin(table, first, operator, second) {
    return this.join(table, first, operator, second, 'RIGHT');
  }

  crossJoin(table) {
    const escTable = this._parseTableName(table);
    this._joins.push(`CROSS JOIN ${escTable}`);
    return this;
  }

  /**
   * Join derived subquery
   */
  joinSub(subquery, alias, first, operator, second, type = 'INNER') {
    const nested = this._resolveSubquery(subquery);
    const subSql = `(${nested.toSql()}) AS \`${alias.replace(/`/g, '')}\``;
    const validOp = this._validateOperator(operator);
    const escFirst = this._escapeColumn(first);
    const escSecond = this._escapeColumn(second);
    
    this._joins.push(`${type} JOIN ${subSql} ON ${escFirst} ${validOp} ${escSecond}`);
    this._selectExpressions.push({ sql: subSql, bindings: nested.getBindings() });
    return this;
  }

  leftJoinSub(subquery, alias, first, operator, second) {
    return this.joinSub(subquery, alias, first, operator, second, 'LEFT');
  }

  groupBy(...columns) {
    const cols = Array.isArray(columns[0]) ? columns[0] : columns;
    cols.forEach(col => {
      this._groupBy.push(this._escapeColumn(col));
    });
    return this;
  }

  having(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    const validOp = this._validateOperator(operator);
    const colName = this._escapeColumn(column);
    this._havings.push({ boolean: 'AND', sql: `${colName} ${validOp} ?`, bindings: [value] });
    this._havingBindings.push(value);
    return this;
  }

  orHaving(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    const validOp = this._validateOperator(operator);
    const colName = this._escapeColumn(column);
    this._havings.push({ boolean: 'OR', sql: `${colName} ${validOp} ?`, bindings: [value] });
    this._havingBindings.push(value);
    return this;
  }

  havingRaw(sql, bindings = []) {
    this._havings.push({ boolean: 'AND', sql, bindings });
    this._havingBindings.push(...bindings);
    return this;
  }

  orderBy(column, direction = 'ASC') {
    const dir = String(direction).trim().toUpperCase();
    if (!['ASC', 'DESC'].includes(dir)) {
      throw new Error(`Invalid order direction '${direction}'. Allowed: 'ASC', 'DESC'.`);
    }
    const colName = this._escapeColumn(column);
    this._orders.push(`${colName} ${dir}`);
    return this;
  }

  orderByDesc(column) {
    return this.orderBy(column, 'DESC');
  }

  orderByRaw(sql) {
    this._orders.push(sql);
    return this;
  }

  latest(column = 'created_at') {
    return this.orderBy(column, 'DESC');
  }

  oldest(column = 'created_at') {
    return this.orderBy(column, 'ASC');
  }

  limit(count) {
    this._limit = parseInt(count, 10);
    return this;
  }

  take(count) {
    return this.limit(count);
  }

  offset(count) {
    this._offset = parseInt(count, 10);
    return this;
  }

  skip(count) {
    return this.offset(count);
  }

  lockForUpdate() {
    this._lock = ' FOR UPDATE';
    return this;
  }

  sharedLock() {
    this._lock = ' LOCK IN SHARE MODE';
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

  _compileHavings() {
    if (this._havings.length === 0) {
      return '';
    }
    let sql = '';
    this._havings.forEach((h, idx) => {
      if (idx === 0) {
        sql += h.sql;
      } else {
        sql += ` ${h.boolean} ${h.sql}`;
      }
    });
    return sql;
  }

  toSql() {
    const escTable = this._subqueryTable ? this._subqueryTable.sql : this._parseTableName(this._table);
    const distinctStr = this._distinct ? 'DISTINCT ' : '';
    const selectStr = this._select || '*';
    let sql = escTable ? `SELECT ${distinctStr}${selectStr} FROM ${escTable}` : `SELECT ${distinctStr}${selectStr}`;

    if (this._joins.length > 0) {
      sql += ` ${this._joins.join(' ')}`;
    }

    const { sql: whereSql } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    if (this._groupBy.length > 0) {
      sql += ` GROUP BY ${this._groupBy.join(', ')}`;
    }

    const havingSql = this._compileHavings();
    if (havingSql) {
      sql += ` HAVING ${havingSql}`;
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

    if (this._lock) {
      sql += this._lock;
    }

    return sql;
  }

  getBindings() {
    const subTableBindings = this._subqueryTable ? this._subqueryTable.bindings : [];
    const selectBindings = this._selectExpressions.flatMap(e => e.bindings);
    const { bindings: whereBindings } = this._compileWheres();
    return [...selectBindings, ...subTableBindings, ...whereBindings, ...this._havingBindings];
  }

  /**
   * Helper to execute queries with logging, slow query detection and timing
   */
  async _query(sql, bindings = []) {
    const executor = this._connection || pool;
    const start = Date.now();
    try {
      const [rows] = await executor.query(sql, bindings);
      const duration = Date.now() - start;
      
      if (isQueryLogging) {
        queryLogs.push({ sql, bindings, durationMs: duration, timestamp: new Date() });
      }

      if (slowQueryThresholdMs > 0 && duration >= slowQueryThresholdMs) {
        if (typeof slowQueryHandler === 'function') {
          slowQueryHandler({ sql, bindings, durationMs: duration });
        } else {
          console.warn(`⚠️ [SLOW QUERY DETECTED] (${duration}ms) SQL: ${sql} | Bindings:`, bindings);
        }
      }

      return rows;
    } catch (err) {
      const duration = Date.now() - start;
      if (isQueryLogging) {
        queryLogs.push({ sql, bindings, durationMs: duration, error: err.message, timestamp: new Date() });
      }
      throw err;
    }
  }

  /**
   * Debug query SQL and Bindings before execution
   */
  debug() {
    const sql = this.toSql();
    const bindings = this.getBindings();
    console.log('\n--- [NodeFlow Query Debug] ---');
    console.log('SQL:     ', sql);
    console.log('Bindings:', bindings);
    console.log('------------------------------\n');
    return this;
  }

  async get() {
    // Check cache first if enabled
    if (this._useCache && cacheManager) {
      const cacheKey = this._generateCacheKey();
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const sql = this.toSql();
    const bindings = this.getBindings();
    
    // Fire querying event
    await this._fireEvent('querying', { sql, bindings });
    
    try {
      const result = await this._query(sql, bindings);
      
      // Fire queried event
      await this._fireEvent('queried', { sql, bindings, result });
      
      // Cache the result if enabled
      if (this._useCache && cacheManager && this._cacheTtl) {
        const cacheKey = this._generateCacheKey();
        await cacheManager.set(cacheKey, result, this._cacheTtl);
      }
      
      return result;
    } catch (error) {
      // Fire error event
      await this._fireEvent('error', { sql, bindings, error });
      throw error;
    }
  }

  async first() {
    const rows = await this.clone().limit(1).get();
    return rows.length > 0 ? rows[0] : null;
  }

  async find(id, primaryKey = 'id') {
    return await this.clone().where(primaryKey, id).first();
  }

  async value(column) {
    const row = await this.clone().select(column).first();
    if (!row) return null;

    if (row[column] !== undefined) return row[column];

    // Check stripped column name
    const rawCol = column.replace(/`/g, '');
    if (row[rawCol] !== undefined) return row[rawCol];

    // Check base column if dot notation e.g. "users.name" -> "name"
    if (rawCol.includes('.')) {
      const baseCol = rawCol.split('.').pop();
      if (row[baseCol] !== undefined) return row[baseCol];
    }

    return Object.values(row)[0] ?? null;
  }

  async pluck(column, keyColumn = null) {
    const selectCols = keyColumn ? [keyColumn, column] : [column];
    const rows = await this.clone().select(selectCols).get();
    
    const resolveVal = (row, col) => {
      if (row[col] !== undefined) return row[col];
      const base = col.replace(/`/g, '').split('.').pop();
      return row[base] !== undefined ? row[base] : row[col];
    };

    if (keyColumn) {
      const result = {};
      rows.forEach(r => {
        const k = resolveVal(r, keyColumn);
        const v = resolveVal(r, column);
        result[k] = v;
      });
      return result;
    }
    return rows.map(r => resolveVal(r, column));
  }

  async exists() {
    const cloned = this.clone();
    cloned._select = '1';
    cloned._limit = 1;
    const rows = await cloned.get();
    return rows.length > 0;
  }

  async doesntExist() {
    return !(await this.exists());
  }

  async aggregate(fn, column = '*') {
    // If GROUP BY is present, count must wrap subquery for correct overall count
    if (this._groupBy.length > 0) {
      const subSql = this.toSql();
      const bindings = this.getBindings();
      const sql = `SELECT ${fn}(*) AS aggregate FROM (${subSql}) AS count_subquery`;
      const rows = await this._query(sql, bindings);
      return rows[0]?.aggregate !== undefined && rows[0]?.aggregate !== null 
        ? Number(rows[0].aggregate) 
        : 0;
    }

    const cloned = this.clone();
    const colStr = column === '*' ? '*' : this._escapeColumn(column);
    cloned._select = `${fn}(${colStr}) AS aggregate`;
    cloned._orders = [];
    const rows = await cloned.get();
    return rows[0]?.aggregate !== undefined && rows[0]?.aggregate !== null 
      ? Number(rows[0].aggregate) 
      : 0;
  }

  async count(column = '*') {
    return await this.aggregate('COUNT', column);
  }

  async countDistinct(column) {
    const cloned = this.clone();
    const colStr = this._escapeColumn(column);
    cloned._select = `COUNT(DISTINCT ${colStr}) AS aggregate`;
    cloned._orders = [];
    const rows = await cloned.get();
    return rows[0]?.aggregate !== undefined && rows[0]?.aggregate !== null 
      ? Number(rows[0].aggregate) 
      : 0;
  }

  async sum(column) {
    return await this.aggregate('SUM', column);
  }

  async avg(column) {
    return await this.aggregate('AVG', column);
  }

  async min(column) {
    return await this.aggregate('MIN', column);
  }

  async max(column) {
    return await this.aggregate('MAX', column);
  }

  /**
   * Automatic Pagination Engine
   */
  async paginate(page = 1, perPage = 15) {
    const curPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(perPage, 10) || 15);
    const offset = (curPage - 1) * limit;

    const total = await this.clone().count();
    const data = await this.clone().limit(limit).offset(offset).get();
    const lastPage = Math.max(1, Math.ceil(total / limit));

    return {
      data,
      meta: {
        total,
        per_page: limit,
        current_page: curPage,
        last_page: lastPage,
        from: total > 0 ? offset + 1 : 0,
        to: Math.min(offset + limit, total)
      }
    };
  }

  /**
   * Memory-safe dataset streaming in batches (Offset based)
   */
  async chunk(size, callback) {
    let page = 1;
    while (true) {
      const rows = await this.clone().limit(size).offset((page - 1) * size).get();
      if (rows.length === 0) break;
      const shouldContinue = await callback(rows, page);
      if (shouldContinue === false || rows.length < size) break;
      page++;
    }
  }

  /**
   * Cursor-based fast chunking using auto-increment Primary Key
   */
  async chunkById(size, callback, column = 'id') {
    let lastId = 0;
    let page = 1;
    while (true) {
      const rows = await this.clone()
        .where(column, '>', lastId)
        .orderBy(column, 'ASC')
        .limit(size)
        .get();

      if (rows.length === 0) break;
      
      const shouldContinue = await callback(rows, page);
      if (shouldContinue === false || rows.length < size) break;

      const lastRow = rows[rows.length - 1];
      lastId = lastRow[column];
      page++;
    }
  }

  /**
   * Lazy loading iterator for large datasets (ES2018 async generator)
   * Usage: for await (const row of DB.table('users').lazy(100)) { ... }
   */
  async * lazy(chunkSize = 100) {
    let page = 1;
    while (true) {
      const rows = await this.clone().limit(chunkSize).offset((page - 1) * chunkSize).get();
      if (rows.length === 0) break;
      for (const row of rows) {
        yield row;
      }
      if (rows.length < chunkSize) break;
      page++;
    }
  }

  /**
   * Get results as a cursor for manual iteration
   * Returns an object with next(), hasMore(), and close() methods
   */
  async cursor(chunkSize = 100) {
    let page = 1;
    let buffer = [];
    let exhausted = false;

    const fetchNextChunk = async () => {
      if (exhausted) return [];
      const rows = await this.clone().limit(chunkSize).offset((page - 1) * chunkSize).get();
      if (rows.length === 0) {
        exhausted = true;
        return [];
      }
      page++;
      return rows;
    };

    return {
      async next() {
        if (buffer.length === 0 && !exhausted) {
          buffer = await fetchNextChunk();
        }
        if (buffer.length === 0) {
          return { done: true, value: null };
        }
        return { done: false, value: buffer.shift() };
      },
      async hasMore() {
        if (buffer.length > 0) return true;
        if (exhausted) return false;
        buffer = await fetchNextChunk();
        return buffer.length > 0;
      },
      close() {
        buffer = [];
        exhausted = true;
      }
    };
  }

  /**
   * Execute query in parallel chunks for improved performance
   * @param {number} totalChunks - Number of parallel chunks to divide the query
   * @param {string} column - Column to use for dividing chunks (default: primary key)
   */
  async parallelChunk(totalChunks = 4, column = 'id') {
    // Get min and max values for the column
    const minMax = await this.clone().selectRaw(`MIN(${column}) as min_val, MAX(${column}) as max_val`).first();
    
    if (!minMax || minMax.min_val === null || minMax.max_val === null) {
      return [];
    }

    const minVal = minMax.min_val;
    const maxVal = minMax.max_val;
    const range = maxVal - minVal;
    
    if (range === 0 || totalChunks === 1) {
      return await this.clone().get();
    }

    const chunkSize = Math.ceil(range / totalChunks);
    const promises = [];

    for (let i = 0; i < totalChunks; i++) {
      const from = minVal + (i * chunkSize);
      const to = i === totalChunks - 1 ? maxVal + 1 : from + chunkSize;
      
      promises.push(
        this.clone()
          .where(column, '>=', from)
          .where(column, '<', to)
          .get()
      );
    }

    const results = await Promise.all(promises);
    return results.flat();
  }

  async insert(data) {
    const keys = Object.keys(data);
    const escapedKeys = keys.map(k => `\`${k.replace(/`/g, '')}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const escTable = this._parseTableName(this._table);
    const sql = `INSERT INTO ${escTable} (${escapedKeys}) VALUES (${placeholders})`;
    const values = Object.values(data);

    const result = await this._query(sql, values);
    return result.insertId;
  }

  async insertGetId(data) {
    return await this.insert(data);
  }

  /**
   * Bulk insert multiple records in a single query
   */
  async insertMany(records) {
    if (!Array.isArray(records) || records.length === 0) return 0;
    const keys = Object.keys(records[0]);
    const escapedKeys = keys.map(k => `\`${k.replace(/`/g, '')}\``).join(', ');
    const rowPlaceholder = `(${keys.map(() => '?').join(', ')})`;
    const placeholders = records.map(() => rowPlaceholder).join(', ');
    const escTable = this._parseTableName(this._table);
    
    const sql = `INSERT INTO ${escTable} (${escapedKeys}) VALUES ${placeholders}`;
    const values = [];
    records.forEach(r => {
      keys.forEach(k => values.push(r[k] !== undefined ? r[k] : null));
    });

    const result = await this._query(sql, values);
    return result.affectedRows;
  }

  /**
   * MySQL UPSERT (Insert or Update on Duplicate Key)
   */
  async upsert(data, updateColumns = null) {
    const records = Array.isArray(data) ? data : [data];
    if (records.length === 0) return 0;

    const keys = Object.keys(records[0]);
    const escapedKeys = keys.map(k => `\`${k.replace(/`/g, '')}\``).join(', ');
    const rowPlaceholder = `(${keys.map(() => '?').join(', ')})`;
    const placeholders = records.map(() => rowPlaceholder).join(', ');
    const escTable = this._parseTableName(this._table);

    const updatesCols = updateColumns || keys;
    const updateClauses = updatesCols.map(k => `\`${k.replace(/`/g, '')}\` = VALUES(\`${k.replace(/`/g, '')}\`)`).join(', ');

    const sql = `INSERT INTO ${escTable} (${escapedKeys}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updateClauses}`;
    const values = [];
    records.forEach(r => {
      keys.forEach(k => values.push(r[k] !== undefined ? r[k] : null));
    });

    const result = await this._query(sql, values);
    return result.affectedRows;
  }

  async update(data) {
    if (this._wheres.length === 0) {
      throw new Error(`Unsafe query: UPDATE on table '${this._table}' without a WHERE clause is not allowed.`);
    }

    const keys = Object.keys(data);
    if (keys.length === 0) return 0;

    const escTable = this._parseTableName(this._table);
    const setClause = keys.map(key => `\`${key.replace(/`/g, '')}\` = ?`).join(', ');
    let sql = `UPDATE ${escTable} SET ${setClause}`;
    const values = Object.values(data);

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const result = await this._query(sql, [...values, ...whereBindings]);
    return result.affectedRows;
  }

  async delete() {
    if (this._wheres.length === 0) {
      throw new Error(`Unsafe query: DELETE on table '${this._table}' without a WHERE clause is not allowed.`);
    }

    const escTable = this._parseTableName(this._table);
    let sql = `DELETE FROM ${escTable}`;
    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const result = await this._query(sql, whereBindings);
    return result.affectedRows;
  }

  async increment(column, amount = 1) {
    if (this._wheres.length === 0) {
      throw new Error(`Unsafe query: INCREMENT on table '${this._table}' without a WHERE clause is not allowed.`);
    }
    const escTable = this._parseTableName(this._table);
    const colName = this._escapeColumn(column);
    let sql = `UPDATE ${escTable} SET ${colName} = ${colName} + ?`;

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const result = await this._query(sql, [amount, ...whereBindings]);
    return result.affectedRows;
  }

  async decrement(column, amount = 1) {
    if (this._wheres.length === 0) {
      throw new Error(`Unsafe query: DECREMENT on table '${this._table}' without a WHERE clause is not allowed.`);
    }
    const escTable = this._parseTableName(this._table);
    const colName = this._escapeColumn(column);
    let sql = `UPDATE ${escTable} SET ${colName} = ${colName} - ?`;

    const { sql: whereSql, bindings: whereBindings } = this._compileWheres();
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    const result = await this._query(sql, [amount, ...whereBindings]);
    return result.affectedRows;
  }
}

/**
 * Main Database Core Wrapper
 */
const DB = {
  pool,
  query: async (sql, params = []) => {
    const start = Date.now();
    const [rows] = await pool.query(sql, params);
    const duration = Date.now() - start;

    if (isQueryLogging) {
      queryLogs.push({ sql, params, durationMs: duration, timestamp: new Date() });
    }

    if (slowQueryThresholdMs > 0 && duration >= slowQueryThresholdMs) {
      if (typeof slowQueryHandler === 'function') {
        slowQueryHandler({ sql, params, durationMs: duration });
      } else {
        console.warn(`⚠️ [SLOW QUERY DETECTED] (${duration}ms) SQL: ${sql} | Params:`, params);
      }
    }

    return rows;
  },
  getConnection: async () => {
    return await pool.getConnection();
  },
  table: (name, connection = null) => {
    return new QueryBuilder(name, connection);
  },
  macro: (name, callback) => {
    QueryBuilder.macro(name, callback);
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
  },
  enableQueryLog: () => {
    isQueryLogging = true;
  },
  disableQueryLog: () => {
    isQueryLogging = false;
  },
  getQueryLog: () => {
    return [...queryLogs];
  },
  flushQueryLog: () => {
    queryLogs = [];
  },
  slowQuery: (thresholdMs, handler = null) => {
    slowQueryThresholdMs = thresholdMs;
    slowQueryHandler = handler;
  },
  on: (event, callback) => {
    QueryBuilder.on(event, callback);
  }
};

module.exports = DB;
