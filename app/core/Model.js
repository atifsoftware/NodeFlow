const DB = require('../../config/db');

/**
 * Custom Thenable Relation Class for NodeFlow Eager Loading
 * Exposes metadata about relations while maintaining backwards compatibility by acting as a Promise.
 */
class Relation {
  constructor(type, RelatedModel, foreignKey, localKey, parentInstance) {
    this.type = type;
    this.RelatedModel = RelatedModel;
    this.foreignKey = foreignKey;
    this.localKey = localKey;
    this.parentInstance = parentInstance;
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
        result = this.type === 'hasMany' ? [] : null;
      } else {
        if (this.type === 'hasMany') {
          result = await qb.where(this.foreignKey, localValue).get();
        } else {
          result = await qb.where(this.foreignKey, localValue).first();
        }
      }
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }
}

/**
 * NodeFlow Base Model Class
 * ORM-like Active Record pattern inspired by NovaFlow PHP Model.
 * Enhanced with Eager Loading (N+1 query solution) and Soft Deletes.
 */
class Model {
  static table = '';
  static primaryKey = 'id';
  static hidden = [];
  static fillable = [];
  static softDeletes = false; // Enabled per model class

  constructor(attributes = {}) {
    this._attributes = {};
    this._exists = false;
    this.fill(attributes);

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target || typeof prop === 'symbol') {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === 'function' && prop !== 'constructor') {
            return value.bind(target);
          }
          return value;
        }
        return target.get(prop);
      },
      set(target, prop, value, receiver) {
        if (prop in target && prop !== '_attributes') {
          return Reflect.set(target, prop, value, receiver);
        }
        target.set(prop, value);
        return true;
      }
    });
  }

  fill(attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      this._attributes[key] = value;
    }
    return this;
  }

  get(key) {
    return this._attributes[key] !== undefined ? this._attributes[key] : null;
  }

  set(key, value) {
    this._attributes[key] = value;
    return this;
  }

  getAttributes() {
    return { ...this._attributes };
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
   * Overridden to handle eager loading and soft deletes
   */
  static query() {
    const qb = DB.table(this.getTable());
    
    // Eager Load & Soft Delete metadata
    qb._eagerLoads = [];
    qb._withTrashed = false;
    qb._onlyTrashed = false;

    // Chainable Query hooks
    qb.with = (...relations) => {
      qb._eagerLoads = [...qb._eagerLoads, ...relations];
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

    const modelClass = this;

    // Internal criteria applicator
    const applyCriteria = () => {
      if (modelClass.softDeletes) {
        if (qb._onlyTrashed) {
          qb.whereNotNull('deleted_at');
        } else if (!qb._withTrashed) {
          qb.whereNull('deleted_at');
        }
      }
    };

    // Override get
    qb.get = async () => {
      applyCriteria();
      const rows = await originalGet();
      const instances = rows.map(r => {
        const inst = new modelClass(r);
        inst._exists = true;
        return inst;
      });

      // Execute eager loaded relations (N+1 query solution)
      if (qb._eagerLoads.length > 0 && instances.length > 0) {
        for (const relation of qb._eagerLoads) {
          if (typeof modelClass.prototype[relation] === 'function') {
            await modelClass.eagerLoadRelation(instances, relation);
          }
        }
      }

      return instances;
    };

    // Override first
    qb.first = async () => {
      applyCriteria();
      const row = await originalFirst();
      if (!row) return null;

      const instance = new modelClass(row);
      instance._exists = true;

      if (qb._eagerLoads.length > 0) {
        for (const relation of qb._eagerLoads) {
          if (typeof modelClass.prototype[relation] === 'function') {
            await modelClass.eagerLoadRelation([instance], relation);
          }
        }
      }

      return instance;
    };

    // Override count
    qb.count = async () => {
      applyCriteria();
      return await originalCount();
    };

    return qb;
  }

  /**
   * Internal Eager Loading engine to resolve and append related properties in a single batch query
   */
  static async eagerLoadRelation(instances, relationName) {
    // Instantiate a dummy model to inspect the relation metadata
    const dummy = new this();
    const relationObj = dummy[relationName]();

    if (!(relationObj instanceof Relation)) {
      return;
    }

    const { type, RelatedModel, foreignKey, localKey } = relationObj;

    // Collect all local keys from parent instances
    const parentKeys = [...new Set(instances.map(inst => inst.get(localKey)).filter(k => k !== null && k !== undefined))];

    if (parentKeys.length === 0) {
      instances.forEach(inst => {
        inst._attributes[relationName] = type === 'hasMany' ? [] : null;
      });
      return;
    }

    // Load related models in a single query
    let relatedInstances = [];
    if (type === 'belongsTo') {
      // For belongsTo, we map using RelatedModel primaryKey
      relatedInstances = await RelatedModel.query().whereIn(RelatedModel.primaryKey, parentKeys).get();
    } else {
      // For hasOne/hasMany, we map using the foreignKey on related table
      relatedInstances = await RelatedModel.query().whereIn(foreignKey, parentKeys).get();
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
  //  CRUD OPERATIONS
  // ──────────────────────────────────────────────

  static async all() {
    return await this.query().get();
  }

  static async find(id) {
    return await this.query().where(this.primaryKey, id).first();
  }

  static async findOrFail(id) {
    const result = await this.find(id);
    if (!result) {
      throw new Error(`${this.name} with ${this.primaryKey} = ${id} not found.`);
    }
    return result;
  }

  static async create(data) {
    return await this.query().insert(data);
  }

  static async update(id, data) {
    return await this.query().where(this.primaryKey, id).update(data);
  }

  static async destroy(id) {
    if (this.softDeletes) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      return await this.query().where(this.primaryKey, id).update({ deleted_at: now });
    }
    return await this.query().where(this.primaryKey, id).delete();
  }

  async save() {
    const ctor = this.constructor;
    const pk = ctor.primaryKey;

    if (this._exists) {
      const id = this._attributes[pk];
      if (!id) throw new Error(`Primary key "${pk}" missing for update.`);
      await ctor.query().where(pk, id).update(this._attributes);
    } else {
      const id = await ctor.query().insert(this._attributes);
      if (id) {
        this._attributes[pk] = id;
        this._exists = true;
      }
    }
    return true;
  }

  async delete() {
    if (!this._exists) return false;
    const ctor = this.constructor;
    const pk = ctor.primaryKey;
    const id = this._attributes[pk];

    if (ctor.softDeletes) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await ctor.query().where(pk, id).update({ deleted_at: now });
      this._attributes.deleted_at = now;
      return true;
    }

    return await ctor.query().where(pk, id).delete();
  }

  /**
   * Restore a soft-deleted record
   */
  async restore() {
    const ctor = this.constructor;
    if (!ctor.softDeletes || !this._exists) return false;

    const pk = ctor.primaryKey;
    const id = this._attributes[pk];
    
    await ctor.query().withTrashed().where(pk, id).update({ deleted_at: null });
    this._attributes.deleted_at = null;
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
        data[key] = value;
      }
    }
    return data;
  }

  toArray() {
    return this.toJSON();
  }
}

module.exports = Model;
