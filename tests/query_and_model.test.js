const { test, describe } = require('node:test');
const assert = require('node:assert');
const DB = require('../config/db');
const Model = require('../app/core/Model');

describe('NodeFlow Advanced QueryBuilder & ORM Unit Tests', () => {

  test('1. where() builds parameterized SQL and escapes correctly', () => {
    const qb = DB.table('users').where('status', 'active').orderBy('id', 'DESC');
    assert.strictEqual(qb.toSql(), 'SELECT * FROM `users` WHERE `status` = ? ORDER BY `id` DESC');
    assert.deepStrictEqual(qb.getBindings(), ['active']);
  });

  test('2. whereAny() builds grouped OR conditions', () => {
    const qb = DB.table('users').whereAny([
      ['name', 'LIKE', '%john%'],
      ['email', 'LIKE', '%john%']
    ]);
    assert.strictEqual(qb.toSql(), 'SELECT * FROM `users` WHERE (`name` LIKE ? OR `email` LIKE ?)');
    assert.deepStrictEqual(qb.getBindings(), ['%john%', '%john%']);
  });

  test('3. whereJsonContains() builds valid MySQL JSON queries', () => {
    const qb = DB.table('users').whereJsonContains('settings', 'dark', '$.theme');
    assert.strictEqual(qb.toSql(), 'SELECT * FROM `users` WHERE JSON_CONTAINS(`settings`, ?, ?)');
    assert.deepStrictEqual(qb.getBindings(), ['"dark"', '$.theme']);
  });

  test('4. Subquery support (selectSub & fromSub & whereInSub)', () => {
    // selectSub
    const qbSelect = DB.table('users')
      .select('users.id')
      .selectSub(sub => {
        sub.from('orders').selectRaw('COUNT(*)').whereColumn('orders.user_id', 'users.id');
      }, 'orders_count');
    
    assert.strictEqual(qbSelect.toSql(), 'SELECT `users`.`id`, (SELECT COUNT(*) FROM `orders` WHERE `orders`.`user_id` = `users`.`id`) AS `orders_count` FROM `users`');

    // fromSub
    const qbFrom = DB.table('temp').fromSub(sub => {
      sub.from('orders').where('status', 'completed');
    }, 'completed_orders');
    assert.strictEqual(qbFrom.toSql(), 'SELECT * FROM (SELECT * FROM `orders` WHERE `status` = ?) AS `completed_orders`');

    // whereInSub
    const qbWhereIn = DB.table('users').whereInSub('id', sub => {
      sub.from('vip_users').select('user_id');
    });
    assert.strictEqual(qbWhereIn.toSql(), 'SELECT * FROM `users` WHERE `id` IN (SELECT `user_id` FROM `vip_users`)');
  });

  test('5. Mass Assignment Security strictly protects fillable and guarded', () => {
    class SecureUser extends Model {
      static table = 'users';
      static fillable = ['name', 'email'];
      static guarded = ['id', 'role', 'is_admin'];
    }

    // Untrusted payload from req.body
    const reqBody = {
      name: 'Atif',
      email: 'atif@example.com',
      role: 'superadmin',
      is_admin: 1
    };

    const user = new SecureUser(reqBody);
    const attrs = user.getAttributes();

    assert.strictEqual(attrs.name, 'Atif');
    assert.strictEqual(attrs.email, 'atif@example.com');
    assert.strictEqual(attrs.role, undefined);
    assert.strictEqual(attrs.is_admin, undefined);

    // forceFill allows intentional internal bypass
    user.forceFill({ role: 'admin' });
    assert.strictEqual(user.get('role'), 'admin');
  });

  test('6. Model Accessors and Mutators (get...Attribute, set...Attribute)', () => {
    class Customer extends Model {
      static table = 'customers';

      getFullNameAttribute() {
        return `${this.get('first_name')} ${this.get('last_name')}`.trim();
      }

      setPasswordAttribute(value) {
        this._attributes['password'] = `hashed_${value}`;
      }
    }

    const customer = new Customer({ first_name: 'John', last_name: 'Doe' });
    assert.strictEqual(customer.full_name, 'John Doe');

    customer.password = 'secret123';
    assert.strictEqual(customer.get('password'), 'hashed_secret123');
  });

  test('7. Global Scopes apply automatically and can be bypassed', () => {
    class ActiveUser extends Model {
      static table = 'users';
    }

    ActiveUser.addGlobalScope('active', qb => {
      qb.where('status', 'active');
    });

    const qb = ActiveUser.query();
    assert.strictEqual(qb.toSql(), 'SELECT * FROM `users` WHERE `status` = ?');

    const qbWithout = ActiveUser.query().withoutGlobalScope('active');
    assert.strictEqual(qbWithout.toSql(), 'SELECT * FROM `users`');
  });

  test('8. Query Builder Macro System', () => {
    DB.macro('filterActive', function () {
      return this.where('status', 'active').where('is_deleted', 0);
    });

    const qb = DB.table('products').filterActive().orderBy('id', 'DESC');
    assert.strictEqual(qb.toSql(), 'SELECT * FROM `products` WHERE `status` = ? AND `is_deleted` = ? ORDER BY `id` DESC');
    assert.deepStrictEqual(qb.getBindings(), ['active', 0]);
  });

  test('9. withCount and withSum Subquery generation', () => {
    class OrderModel extends Model {
      static table = 'orders';
    }

    class AccountModel extends Model {
      static table = 'accounts';
      orders() {
        return this.hasMany(OrderModel, 'account_id', 'id');
      }
    }

    const qbCount = AccountModel.query().withCount('orders');
    assert.strictEqual(qbCount.toSql(), 'SELECT `accounts`.*, (SELECT COUNT(*) FROM `orders` WHERE `orders`.`account_id` = `accounts`.`id`) AS `orders_count` FROM `accounts`');

    const qbSum = AccountModel.query().withSum('orders', 'total_amount');
    assert.strictEqual(qbSum.toSql(), 'SELECT `accounts`.*, (SELECT COALESCE(SUM(`total_amount`), 0) FROM `orders` WHERE `orders`.`account_id` = `accounts`.`id`) AS `orders_sum_total_amount` FROM `accounts`');
  });

  test('10. Nested and Constrained Eager Loading syntax definitions', () => {
    class ItemModel extends Model { static table = 'items'; }
    class OrderModel extends Model {
      static table = 'orders';
      items() { return this.hasMany(ItemModel, 'order_id', 'id'); }
    }
    class UserModel extends Model {
      static table = 'users';
      orders() { return this.hasMany(OrderModel, 'user_id', 'id'); }
    }

    const qb = UserModel.query().with('orders.items').with({
      orders: q => q.where('status', 'delivered').latest()
    });

    assert.ok(qb._eagerLoads['orders.items'] === null);
    assert.ok(typeof qb._eagerLoads['orders'] === 'function');
  });

});
