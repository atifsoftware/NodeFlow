# 🚀 NodeFlow Framework

> **High-Performance, Developer-Friendly Express.js MVC Framework for Node.js**  
> *Inspired by the elegance of Laravel, built for the speed of Node.js.*

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-000000?logo=express)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2FMariaDB-4479A1?logo=mysql)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-atifsoftware%2FNodeFlow-181717?logo=github)](https://github.com/atifsoftware/NodeFlow)

---

## 🌟 Overview

**NodeFlow** is a modern, enterprise-ready **Node.js Express MVC Framework**. It brings the developer satisfaction and architecture pattern of PHP Laravel directly into Node.js, providing an out-of-the-box solution for building robust web applications, REST APIs, and microservices.

Whether you are building enterprise management software, real-time dashboards, or scalable APIs, **NodeFlow** gives you standard abstractions for routing, database query building, dual authentication, RBAC authorization, CLI code generators, queue background workers, and Swagger API documentation.

---

## ✨ Key Features

- ⚡ **Fluent Query Builder (`config/db.js`)**: Laravel Eloquent-inspired chainable SQL query builder with parameterized safety, joins, subqueries, and transactions.
- 📦 **Active Record ORM (`Model.js`)**: Simple model definitions with relationship mapping, hidden attributes, and automatic password hashing.
- 🔒 **Dual Authentication System**:
  - **Web Session Auth**: Cookie-based session auth backed by `session-file-store`.
  - **API Sanctum Tokens**: Personal Access Tokens (Bearer tokens) with granular abilities.
- 🛡️ **Role-Based Access Control (RBAC) & Gates**: Fine-grained permissions check via `Gate.js` and `can()` / `apiCan()` middlewares.
- 💻 **NodeFlow Artisan Generator CLI (`cli.js`)**: Scaffold Controllers, Models, Migrations, and Seeders with a single terminal command.
- 📡 **Socket.io WebSockets Integration**: Built-in WebSocket event broadcasting layer (`Socket.js`) for instant real-time updates.
- ⚙️ **Background Queue Worker**: Process heavy background jobs, emails, and notifications asynchronously via `Queue.js`.
- 📖 **Swagger OpenAPI Spec Generator**: Interactive Swagger UI auto-mounted at `/api/docs`.
- 🛡️ **Built-in Security**: Anti-DDoS Rate Limiting, Helmet Security Headers, CSRF Guard, and Gzip compression.

---

## 📂 Directory Architecture

```
NodeFlow/
├── app/
│   ├── controllers/      # Route controllers
│   ├── core/             # Framework core classes (Model, QueryBuilder, Gate, Cache)
│   ├── jobs/             # Async background queue jobs
│   ├── middlewares/      # Express middlewares (Auth, CSRF, RateLimit)
│   ├── models/           # Active Record Models
│   ├── services/         # Business logic services
│   └── views/            # EJS page views & layouts
├── config/
│   ├── db.js             # MySQL Connection Pool & Fluent Query Builder
│   └── swagger.js        # Swagger OpenAPI generator
├── database/
│   ├── migrations/       # Schema migrations
│   └── seeders/          # Database seeders
├── public/               # Public static assets (CSS, JS, Uploads)
├── routes/
│   ├── api.js            # REST API endpoints
│   ├── auth.js           # Session auth endpoints
│   └── web.js            # Web view endpoints
├── cli.js                # NodeFlow Artisan Generator CLI
├── database.sql          # Base MySQL SQL dump
├── db_guide.md           # Fluent Query Builder Documentation
├── nodemon.json          # Development watching config
└── server.js             # Express application bootstrapper
```

---

## 🚀 Quick Start & Installation

### 1. Clone Repository
```bash
git clone https://github.com/atifsoftware/NodeFlow.git
cd NodeFlow
```

### 2. Install NPM Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and set your MySQL credentials:
```bash
cp .env.example .env
```

Configure your `.env` file:
```ini
PORT=3001
APP_NAME=NodeFlow Framework
APP_URL=http://localhost:3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=nodeflow_db
```

### 4. Database Setup
Import `database.sql` into your MySQL server:
```bash
mysql -u root -p nodeflow_db < database.sql
```

### 5. Launch Development Server
```bash
npm run dev
```

Visit the application at: **`http://localhost:3001`**  
Access Swagger API Docs at: **`http://localhost:3001/api/docs`**  
Access Developer Documentation at: **`http://localhost:3001/docs`**

---

## 💻 CLI Code Generator Commands

Scaffold components effortlessly using `node cli.js`:

```bash
# Generate Controller
node cli.js make:controller OrderController

# Generate Model
node cli.js make:model Order

# Generate Migration
node cli.js make:migration create_orders_table

# Run Seeders
node cli.js db:seed
```

---

## 💾 Query Builder Examples

```javascript
const DB = require('./config/db');

// Chainable Select Query
const users = await DB.table('users')
  .select(['id', 'name', 'email'])
  .where('status', 'active')
  .orderBy('id', 'DESC')
  .limit(10)
  .get();

// Transaction Support
await DB.transaction(async (trx) => {
  await trx.table('users').where('id', 1).update({ status: 'active' });
});
```

---

## 🔑 Default Credentials

- **Admin Login URL**: `http://localhost:3001/login`
- **Username / Email**: `admin` or `admin@nodeflow.com`
- **Password**: `admin123`

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to [https://github.com/atifsoftware/NodeFlow](https://github.com/atifsoftware/NodeFlow).

---

## 📄 License

NodeFlow Framework is open-sourced software licensed under the [MIT License](LICENSE).  
Developed by **Atif Software**.
