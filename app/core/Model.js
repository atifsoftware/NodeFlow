const DB = require('../../config/db');

/**
 * Helper to convert snake_case or camelCase to PascalCase (e.g. "full_name" -> "FullName")
 */
function toPascalCase(str) {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase());
}

/**
 * Custom Thenable Relation Class for NodeFlow Eager Loading & Execution
 */
class Relation {
  constructor(type, RelatedModel, foreignKey, localKey, parentInstance, extra = {}) {
    this.type = type;
    this.RelatedModel = RelatedModel;
    this.foreignKey = foreignKey;
    this.localKey = localKey;
    this.parentInstance = parentInstance;
    this.extra = extra; // For belongsToMany: { pivotTable, foreignPivotKey, relatedPivotKey }
  }

  /**
   * Promise compatibility (Allows 'await model.relation()' to fetch asynchronously)
   */
  async then(resolve, reject) {
    try {
      let result;
      const qb = this.RelatedModel.query();
      const localValue = this.parentInstance.get(this.localKey);
      
      if (localValue === undefined || localValue === null) {
        result = (this.type === 'hasMany' || this.type === 'belongsToMany') ? [] : null;
      } else {
        if (this.type === 'hasMany') {
          result = await qb.where(this.foreignKey, localValue).get();
        } else if (this.type === 'hasOne' || this.type === 'belongsTo') {
          result = await qb.where(this.foreignKey, localValue).first();
        } else if (this.type === 'belongsToMany') {
          const { pivotTable, foreignPivotKey, relatedPivotKey } = this.extra;
          result = await qb
            .select(`${this.RelatedModel.getTable()}.*`)
            .join(pivotTable, `${pivotTable}.${relatedPivotKey}`, '=', `${this.RelatedModel.getTable()}.${this.RelatedModel.primaryKey}`)
            .where(`${pivotTable}.${foreignPivotKey}`, localValue)
            .get();
        }
      }
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  /**
   * Attach records to a many-to-many pivot table
   */
  async attach(ids, extraAttributes = {}, connection = null) {
    if (this.type !== 'belongsToMany') {
      throw new Error("The attach() method is only available on belongsToMany relations.");
    }
    const parentId = this.parentInstance.get(this.localKey);
    if (parentId === null || parentId === undefined) {
      throw new Error('Parent model must be saved before attaching relations.');
    }

    const { pivotTable, foreignPivotKey, relatedPivotKey } = this.extra;
    const idList = Array.isArray(ids) ? ids : [ids];

    const records = idList.map(id => ({
      [foreignPivotKey]: parentId,
      [relatedPivotKey]: id,
      ...extraAttributes
    }));

    return await DB.table(pivotTable, connection).insertMany(records);
  }

  /**
   * Detach records from a many-to-many pivot table
   */
  async detach(ids = null, connection = null) {
    if (this.type !== 'belongsToMany') {
      throw new Error("The detach() method is only available on belongsToMany relations.");
    }
    const parentId = this.parentInstance.get(this.localKey);
    if (parentId === null || parentId === undefined) {
      return 0;
    }

    const { pivotTable, foreignPivotKey, relatedPivotKey } = this.extra;
    const qb = DB.table(pivotTable, connection).where(foreignPivotKey, parentId);
    if (ids !== null) {
      const idList = Array.isArray(ids) ? ids : [ids];
      qb.whereIn(relatedPivotKey, idList);
    }
    return await qb.delete();
  }

  /**
   * Sync pivot table records (detach missing, attach new)
   */
  async sync(ids, connection = null) {
    await this.detach(null, connection);
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length > 0) {
      return await this.attach(idList, {}, connection);
    }
    return 0;
  }
}

/**
 * NodeFlow Base Model Class
 * ORM Active Record pattern inspired by Laravel Eloquent.
 * Features: Mass Assignment Security, Accessors/Mutators, Nested Eager Loading, withCount/withSum,
 * Soft Deletes, Timestamps, Casts, Scopes, Dirty Tracking, Events & Transactions.
 */
class Model {
  static table = '';
  static primaryKey = 'id';
  static hidden = [];
  static fillable = [];
  static guarded = ['id'];
  static timestamps = true;
  static softDeletes = false;
  static casts = {};
  static _hooks = {};
  static _globalScopes = {};

  constructor(attributes = {}) {
    this._attributes = {};
    this._original = {};
    this._exists = false;
    this.fill(attributes);

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }

        // 1. Check for Model Accessor: get{PascalCase}Attribute()
        const accessorName = `get${toPascalCase(prop)}Attribute`;
        if (typeof target[accessorName] === 'function') {
          return target[accessorName](target.get(prop));
        }

        // 2. Standard method/property resolution
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === 'function' && prop !== 'constructor') {
            return value.bind(target);
          }
          return value;
        }

        // 3. Dynamic Attribute lookup
        return target.get(prop);
      },
      set(target, prop, value, receiver) {
        if (typeof prop === 'symbol') {
          return Reflect.set(target, prop, value, receiver);
        }

        // 1. Check for Model Mutator: set{PascalCase}Attribute(value)
        const mutatorName = `set${toPascalCase(prop)}Attribute`;
        if (typeof target[mutatorName] === 'function') {
          target[mutatorName](value);
          return true;
        }

        if (prop in target && prop !== '_attributes') {
          return Reflect.set(target, prop, value, receiver);
        }

        target.set(prop, value);
        return true;
      }
    });
  }

  /**
   * Fresh formatted SQL timestamp string
   */
  static freshTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Register lifecycle event listener without cross-model inheritance leaks
   */
  static on(event, callback) {
    if (!Object.prototype.hasOwnProperty.call(this, '_hooks')) {
      this._hooks = {};
    }
    if (!this._hooks[event]) {
      this._hooks[event] = [];
    }
    this._hooks[event].push(callback);
  }

  /**
   * Fire lifecycle event
   */
  async _fire(event) {
    const hooks = (this.constructor._hooks && this.constructor._hooks[event]) || [];
    for (const callback of hooks) {
      const result = await callback(this);
      if (result === false) {
        return false;
      }
    }
    return true;
  }

  /**
   * Register a Global Scope
   */
  static addGlobalScope(name, callback) {
    if (!Object.prototype.hasOwnProperty.call(this, '_globalScopes')) {
      this._globalScopes = {};
    }
    this._globalScopes[name] = callback;
  }

  /**
   * Mass Assignment Fill (Strictly protects fillable & guarded attributes)
   */
  fill(attributes) {
    if (!attributes || typeof attributes !== 'object') return this;

    const fillable = this.constructor.fillable || [];
    const guarded = this.constructor.guarded || [];

    for (const [key, value] of Object.entries(attributes)) {
      // If fillable specified, only allow keys explicitly listed
      if (fillable.length > 0) {
        if (!fillable.includes(key)) continue;
      } else if (guarded.length > 0) {
        // If guarded is ['*'] or includes key, disallow
        if (guarded.includes('*') || guarded.includes(key)) continue;
      }

      this.set(key, value);
    }
    return this;
  }

  /**
   * Force fill all attributes bypassing mass assignment protection
   */
  forceFill(attributes) {
    if (!attributes || typeof attributes !== 'object') return this;
    for (const [key, value] of Object.entries(attributes)) {
      this.set(key, value);
    }
    return this;
  }

  get(key) {
    let value = this._attributes[key] !== undefined ? this._attributes[key] : null;
    const cast = this.constructor.casts ? this.constructor.casts[key] : null;

    if (value === null || !cast) {
      return value;
    }

    switch (cast.toLowerCase()) {
      case 'boolean':
      case 'bool':
        return Boolean(value) && value !== '0' && value !== 0;
      case 'integer':
      case 'int':
        return parseInt(value, 10);
      case 'float':
      case 'double':
      case 'decimal':
      case 'number':
        return parseFloat(value);
      case 'json':
      case 'array':
      case 'object':
        return typeof value === 'string' ? JSON.parse(value) : value;
      case 'datetime':
      case 'date':
        return value instanceof Date ? value : new Date(value);
      default:
        return value;
    }
  }

  set(key, value) {
    // Check if mutator exists
    const mutatorName = `set${toPascalCase(key)}Attribute`;
    if (typeof this[mutatorName] === 'function') {
      this[mutatorName](value);
      return this;
    }

    const cast = this.constructor.casts ? this.constructor.casts[key] : null;
    if (cast && (cast.toLowerCase() === 'json' || cast.toLowerCase() === 'array' || cast.toLowerCase() === 'object')) {
      if (typeof value === 'object' && value !== null) {
        this._attributes[key] = JSON.stringify(value);
        return this;
      }
    }
    this._attributes[key] = value;
    return this;
  }

  getAttributes() {
    return { ...this._attributes };
  }

  getRawAttributes() {
    return { ...this._attributes };
  }

  /**
   * Check if model attribute(s) have been modified
   */
  isDirty(key = null) {
    if (key) {
      return this._attributes[key] !== this._original[key];
    }
    const allKeys = new Set([...Object.keys(this._attributes), ...Object.keys(this._original)]);
    for (const k of allKeys) {
      if (this._attributes[k] !== this._original[k]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all modified attributes
   */
  getDirty() {
    const dirty = {};
    for (const [key, value] of Object.entries(this._attributes)) {
      if (value !== this._original[key]) {
        dirty[key] = value;
      }
    }
    return dirty;
  }

  static getTable() {
    if (this.table) return this.table;
    const className = this.name;
    const snake = className.replace(/([A-Z])/g, (match, p1, offset) => {
      return offset > 0 ? '_' + p1.toLowerCase() : p1.toLowerCase();
    });
    return snake + 's';
  }

  /**
   * Start a new QueryBuilder scoped to this model's table
   * Supports Eager Loading, withCount/withSum, Soft Deletes, Scopes, and Transactions
   */
  static query(connection = null) {
    const qb = DB.table(this.getTable(), connection);
    
    // Eager Load & Soft Delete metadata
    qb._eagerLoads = {}; // Map of { relationPath: constraintCallback }
    qb._withTrashed = false;
    qb._onlyTrashed = false;
    qb._criteriaApplied = false;
    qb._ignoredGlobalScopes = [];

    // Chainable Query hooks
    qb.with = (...relations) => {
      relations.forEach(rel => {
        if (typeof rel === 'string') {
          qb._eagerLoads[rel] = null;
        } else if (Array.isArray(rel)) {
          rel.forEach(r => { qb._eagerLoads[r] = null; });
        } else if (typeof rel === 'object' && rel !== null) {
          for (const [key, cb] of Object.entries(rel)) {
            qb._eagerLoads[key] = cb;
          }
        }
      });
      return qb;
    };

    /**
     * Include count of related records as {relation}_count subquery
     */
    qb.withCount = (relation, callback = null) => {
      const dummy = new modelClass();
      if (typeof dummy[relation] !== 'function') {
        throw new Error(`Relation '${relation}' not defined on model ${modelClass.name}`);
      }
      const relObj = dummy[relation]();
      const { RelatedModel, foreignKey, localKey } = relObj;

      qb.selectSub(sub => {
        sub.from(RelatedModel.getTable())
          .selectRaw('COUNT(*)')
          .whereColumn(`${RelatedModel.getTable()}.${foreignKey}`, `${modelClass.getTable()}.${localKey}`);
        if (typeof callback === 'function') callback(sub);
      }, `${relation}_count`);

      return qb;
    };

    /**
     * Include sum of related column as {relation}_sum_{column}
     */
    qb.withSum = (relation, column, callback = null) => {
      const dummy = new modelClass();
      const relObj = dummy[relation]();
      const { RelatedModel, foreignKey, localKey } = relObj;

      qb.selectSub(sub => {
        sub.from(RelatedModel.getTable())
          .selectRaw(`COALESCE(SUM(\`${column.replace(/`/g, '')}\`), 0)`)
          .whereColumn(`${RelatedModel.getTable()}.${foreignKey}`, `${modelClass.getTable()}.${localKey}`);
        if (typeof callback === 'function') callback(sub);
      }, `${relation}_sum_${column}`);

      return qb;
    };

    qb.withoutGlobalScope = (scopeName) => {
      qb._ignoredGlobalScopes.push(scopeName);
      return qb;
    };

    qb.withoutGlobalScopes = () => {
      qb._ignoredGlobalScopes = Object.keys(modelClass._globalScopes || {});
      return qb;
    };

    qb.withTrashed = () => {
      qb._withTrashed = true;
      return qb;
    };

    qb.onlyTrashed = () => {
      qb._onlyTrashed = true;
      return qb;
    };

    // Keep references to original execution methods
    const originalGet = qb.get.bind(qb);
    const originalFirst = qb.first.bind(qb);
    const originalCount = qb.count.bind(qb);
    const originalPaginate = qb.paginate.bind(qb);
    const originalUpdate = qb.update.bind(qb);
    const originalDelete = qb.delete.bind(qb);
    const originalToSql = qb.toSql.bind(qb);

    const modelClass = this;

    // Internal criteria applicator (ensures criteria only added once)
    const applyCriteria = () => {
      if (!qb._criteriaApplied) {
        // Apply Global Scopes
        const globalScopes = modelClass._globalScopes || {};
        for (const [name, callback] of Object.entries(globalScopes)) {
          if (!qb._ignoredGlobalScopes.includes(name) && typeof callback === 'function') {
            callback(qb);
          }
        }

        // Apply Soft Delete scope
        if (modelClass.softDeletes) {
          if (qb._onlyTrashed) {
            qb.whereNotNull('deleted_at');
          } else if (!qb._withTrashed) {
            qb.whereNull('deleted_at');
          }
        }
        qb._criteriaApplied = true;
      }
    };

    // Override toSql to ensure criteria/scopes are compiled
    qb.toSql = () => {
      applyCriteria();
      return originalToSql();
    };

    // Helper to safely hydrate row into Model instance without fillable filtering
    const wrapInstance = (row) => {
      const inst = new modelClass();
      Object.assign(inst._attributes, row); // Direct hydration
      inst._exists = true;
      inst._original = { ...row };
      return inst;
    };

    // Override get
    qb.get = async () => {
      applyCriteria();
      const rows = await originalGet();
      const instances = rows.map(wrapInstance);

      // Execute eager loaded relations (supports nested and constrained with)
      if (Object.keys(qb._eagerLoads).length > 0 && instances.length > 0) {
        await modelClass.resolveEagerLoads(instances, qb._eagerLoads);
      }

      return instances;
    };

    // Override first
    qb.first = async () => {
      applyCriteria();
      const row = await originalFirst();
      if (!row) return null;

      const instance = wrapInstance(row);

      if (Object.keys(qb._eagerLoads).length > 0) {
        await modelClass.resolveEagerLoads([instance], qb._eagerLoads);
      }

      return instance;
    };

    // Override count
    qb.count = async (col = '*') => {
      applyCriteria();
      return await originalCount(col);
    };

    // Override paginate with Model wrapping & eager loading
    qb.paginate = async (page = 1, perPage = 15) => {
      applyCriteria();
      const result = await originalPaginate(page, perPage);
      const instances = result.data.map(wrapInstance);

      if (Object.keys(qb._eagerLoads).length > 0 && instances.length > 0) {
        await modelClass.resolveEagerLoads(instances, qb._eagerLoads);
      }

      result.data = instances;
      return result;
    };

    // Override update to respect soft deletes
    qb.update = async (data) => {
      applyCriteria();
      return await originalUpdate(data);
    };

    // Override delete to respect soft deletes
    qb.delete = async () => {
      if (modelClass.softDeletes && !qb._onlyTrashed && !qb._withTrashed) {
        const now = modelClass.freshTimestamp();
        return await originalUpdate({ deleted_at: now });
      }
      return await originalDelete();
    };

    // Dynamically register Local Scopes from model prototype and static methods
    const attachScopes = (target) => {
      const propNames = Object.getOwnPropertyNames(target);
      for (const prop of propNames) {
        if (prop.startsWith('scope') && typeof target[prop] === 'function') {
          const scopeName = prop.slice(5).charAt(0).toLowerCase() + prop.slice(6);
          qb[scopeName] = (...args) => {
            target[prop].call(target, qb, ...args);
            return qb;
          };
        }
      }
    };

    attachScopes(modelClass.prototype);
    attachScopes(modelClass);

    return qb;
  }

  /**
   * Resolve and execute all nested & constrained eager loading definitions
   */
  static async resolveEagerLoads(instances, eagerLoads) {
    for (const [relationPath, constraintCb] of Object.entries(eagerLoads)) {
      const parts = relationPath.split('.');
      const topRelation = parts[0];
      const nestedPath = parts.slice(1).join('.');

      // Load immediate relation
      await this.eagerLoadRelation(instances, topRelation, constraintCb, nestedPath);
    }
  }

  /**
   * Internal Eager Loading engine to resolve and append related properties in batch (Supports Nesting & Constraints)
   */
  static async eagerLoadRelation(instances, relationName, constraintCallback = null, nestedPath = '') {
    const dummy = new this();
    if (typeof dummy[relationName] !== 'function') {
      return;
    }
    const relationObj = dummy[relationName]();

    if (!(relationObj instanceof Relation)) {
      return;
    }

    const { type, RelatedModel, foreignKey, localKey, extra } = relationObj;

    // Collect all local keys from parent instances
    const parentKeys = [...new Set(instances.map(inst => inst.get(localKey)).filter(k => k !== null && k !== undefined))];

    if (parentKeys.length === 0) {
      instances.forEach(inst => {
        inst._attributes[relationName] = (type === 'hasMany' || type === 'belongsToMany') ? [] : null;
      });
      return;
    }

    let relatedQuery = RelatedModel.query();
    
    // Apply nested child relations if path exists e.g. "items.product"
    if (nestedPath) {
      relatedQuery.with(nestedPath);
    }

    // Apply custom query constraint callback if provided
    if (typeof constraintCallback === 'function') {
      constraintCallback(relatedQuery);
    }

    let relatedInstances = [];
    if (type === 'belongsTo') {
      relatedInstances = await relatedQuery.whereIn(RelatedModel.primaryKey, parentKeys).get();
    } else if (type === 'belongsToMany') {
      const { pivotTable, foreignPivotKey, relatedPivotKey } = extra;
      const pivotRows = await DB.table(pivotTable).whereIn(foreignPivotKey, parentKeys).get();
      const relatedIds = [...new Set(pivotRows.map(r => r[relatedPivotKey]))];
      
      if (relatedIds.length > 0) {
        const loadedModels = await relatedQuery.whereIn(RelatedModel.primaryKey, relatedIds).get();
        
        instances.forEach(inst => {
          const pId = inst.get(localKey);
          const matchedPivot = pivotRows.filter(pr => String(pr[foreignPivotKey]) === String(pId));
          const targetIds = matchedPivot.map(pr => String(pr[relatedPivotKey]));
          inst._attributes[relationName] = loadedModels.filter(m => targetIds.includes(String(m.get(RelatedModel.primaryKey))));
        });
      } else {
        instances.forEach(inst => {
          inst._attributes[relationName] = [];
        });
      }
      return;
    } else {
      relatedInstances = await relatedQuery.whereIn(foreignKey, parentKeys).get();
    }

    // Map and assign related records to parent instances
    instances.forEach(inst => {
      const currentLocalVal = inst.get(localKey);
      
      if (type === 'hasMany') {
        const matches = relatedInstances.filter(rel => String(rel.get(foreignKey)) === String(currentLocalVal));
        inst._attributes[relationName] = matches;
      } else if (type === 'hasOne') {
        const match = relatedInstances.find(rel => String(rel.get(foreignKey)) === String(currentLocalVal)) || null;
        inst._attributes[relationName] = match;
      } else if (type === 'belongsTo') {
        const match = relatedInstances.find(rel => String(rel.get(RelatedModel.primaryKey)) === String(currentLocalVal)) || null;
        inst._attributes[relationName] = match;
      }
    });
  }

  // ──────────────────────────────────────────────
  //  CRUD OPERATIONS & CONVENIENCE METHODS
  // ──────────────────────────────────────────────

  static async all(connection = null) {
    return await this.query(connection).get();
  }

  static async find(id, connection = null) {
    return await this.query(connection).where(this.primaryKey, id).first();
  }

  static async findOrFail(id, connection = null) {
    const result = await this.find(id, connection);
    if (!result) {
      throw new Error(`${this.name} with ${this.primaryKey} = ${id} not found.`);
    }
    return result;
  }

  static async create(data, connection = null) {
    const instance = new this(data);
    await instance.save(connection);
    return instance;
  }

  static async firstOrCreate(search, values = {}, connection = null) {
    const found = await this.query(connection).where(search).first();
    if (found) return found;
    return await this.create({ ...search, ...values }, connection);
  }

  static async updateOrCreate(search, values, connection = null) {
    const found = await this.query(connection).where(search).first();
    if (found) {
      found.fill(values);
      await found.save(connection);
      return found;
    }
    return await this.create({ ...search, ...values }, connection);
  }

  static async firstOrNew(search, values = {}) {
    const found = await this.query().where(search).first();
    if (found) return found;
    return new this({ ...search, ...values });
  }

  static async update(id, data, connection = null) {
    const instance = await this.find(id, connection);
    if (!instance) return 0;
    instance.fill(data);
    await instance.save(connection);
    return 1;
  }

  static async destroy(id, connection = null) {
    const instance = await this.find(id, connection);
    if (!instance) return false;
    return await instance.delete(connection);
  }

  async save(connection = null) {
    const ctor = this.constructor;
    const pk = ctor.primaryKey;
    const now = ctor.freshTimestamp();

    // Fire saving event
    if ((await this._fire('saving')) === false) return false;

    if (this._exists) {
      // Updating
      if ((await this._fire('updating')) === false) return false;

      if (ctor.timestamps) {
        this._attributes.updated_at = now;
      }

      const id = this._attributes[pk];
      if (!id) throw new Error(`Primary key "${pk}" missing for update.`);

      const dirty = this.getDirty();
      if (Object.keys(dirty).length > 0) {
        await ctor.query(connection).where(pk, id).update(dirty);
      }

      this._original = { ...this._attributes };
      await this._fire('updated');
      await this._fire('saved');
    } else {
      // Creating
      if ((await this._fire('creating')) === false) return false;

      if (ctor.timestamps) {
        if (!this._attributes.created_at) this._attributes.created_at = now;
        if (!this._attributes.updated_at) this._attributes.updated_at = now;
      }

      const id = await ctor.query(connection).insert(this._attributes);
      if (id) {
        this._attributes[pk] = id;
        this._exists = true;
      }

      this._original = { ...this._attributes };
      await this._fire('created');
      await this._fire('saved');
    }
    return true;
  }

  async delete(connection = null) {
    if (!this._exists) return false;
    const ctor = this.constructor;
    const pk = ctor.primaryKey;
    const id = this._attributes[pk];

    if ((await this._fire('deleting')) === false) return false;

    if (ctor.softDeletes) {
      const now = ctor.freshTimestamp();
      await ctor.query(connection).where(pk, id).update({ deleted_at: now });
      this._attributes.deleted_at = now;
    } else {
      await ctor.query(connection).where(pk, id).delete();
    }

    await this._fire('deleted');
    return true;
  }

  /**
   * Restore a soft-deleted record with lifecycle events
   */
  async restore(connection = null) {
    const ctor = this.constructor;
    if (!ctor.softDeletes || !this._exists) return false;

    if ((await this._fire('restoring')) === false) return false;

    const pk = ctor.primaryKey;
    const id = this._attributes[pk];
    
    await ctor.query(connection).withTrashed().where(pk, id).update({ deleted_at: null });
    this._attributes.deleted_at = null;

    await this._fire('restored');
    return true;
  }

  // ──────────────────────────────────────────────
  //  RELATIONSHIPS
  // ──────────────────────────────────────────────

  hasMany(RelatedModel, foreignKey, localKey) {
    localKey = localKey || this.constructor.primaryKey;
    return new Relation('hasMany', RelatedModel, foreignKey, localKey, this);
  }

  hasOne(RelatedModel, foreignKey, localKey) {
    localKey = localKey || this.constructor.primaryKey;
    return new Relation('hasOne', RelatedModel, foreignKey, localKey, this);
  }

  belongsTo(RelatedModel, foreignKey, ownerKey) {
    ownerKey = ownerKey || RelatedModel.primaryKey;
    return new Relation('belongsTo', RelatedModel, foreignKey, ownerKey, this);
  }

  belongsToMany(RelatedModel, pivotTable, foreignPivotKey, relatedPivotKey, parentKey = null) {
    parentKey = parentKey || this.constructor.primaryKey;
    return new Relation('belongsToMany', RelatedModel, null, parentKey, this, {
      pivotTable,
      foreignPivotKey,
      relatedPivotKey
    });
  }

  // ──────────────────────────────────────────────
  //  SERIALIZATION
  // ──────────────────────────────────────────────

  toJSON() {
    const data = {};
    const hiddenFields = this.constructor.hidden || [];

    for (const [key, value] of Object.entries(this._attributes)) {
      if (hiddenFields.includes(key)) continue;

      if (value instanceof Model) {
        data[key] = value.toJSON();
      } else if (Array.isArray(value)) {
        data[key] = value.map(val => val instanceof Model ? val.toJSON() : val);
      } else {
        data[key] = this.get(key);
      }
    }
    return data;
  }

  toArray() {
    return this.toJSON();
  }
}

module.exports = Model;
