# NodeFlow Framework - TypeScript & Redis Cache Update

## 🚀 উন্নয়নসমূহ (Improvements)

### ১. TypeScript সাপোর্ট যুক্ত করা হয়েছে
- `tsconfig.json` কনফিগারেশন ফাইল তৈরি করা হয়েছে
- সমস্ত প্রয়োজনীয় TypeScript ডেফিনিশন প্যাকেজ ইনস্টল করা হয়েছে
- Path alias সেটআপ (@app, @config, @routes, @core)
- Strict mode, decorators, এবং source map সাপোর্ট

**ইনস্টল করা প্যাকেজসমূহ:**
```bash
typescript @types/node @types/express @types/bcryptjs 
@types/compression @types/cookie-parser @types/dotenv 
@types/ejs @types/express-fileupload @types/express-session 
@types/jsonwebtoken @types/swagger-jsdoc @types/swagger-ui-express 
ts-node tsconfig-paths
```

### ২. Redis Cache ইন্টিগ্রেশন
- **RedisService** (`app/core/RedisService.ts`): পূর্ণাঙ্গ Redis ক্লায়েন্ট সার্ভিস
- **CacheManager** (`app/core/CacheManager.ts`): TypeScript-based cache ম্যানেজার
- **Hybrid Cache System** (`app/core/Cache.js`): Redis + File-based ফলব্যাক সিস্টেম

**ফিচারসমূহ:**
- ✅ অটোমেটিক Redis ডিটেকশন এবং কানেকশন
- ✅ ফলব্যাক ফাইল-বেসড ক্যাশিং (যদি Redis না থাকে)
- ✅ TTL (Time-To-Live) সাপোর্ট
- ✅ Cache get, set, delete, has operations
- ✅ Cache remember (callback-based caching)
- ✅ Increment/Decrement অপারেশন
- ✅ Hash এবং List অপারেশন

### ৩. এনভায়রনমেন্ট কনফিগারেশন আপডেট
`.env.example` ফাইলে Redis কনফিগারেশন যুক্ত করা হয়েছে:
```env
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 📦 ব্যবহারের নিয়ম

### TypeScript ফাইল তৈরি করুন
নতুন ফাইল `.ts` এক্সটেনশনে তৈরি করুন এবং TypeScript সিনট্যাক্স ব্যবহার করুন:

```typescript
// app/models/User.ts
import { Model } from '@core/Model';

interface User extends Model {
  id: number;
  name: string;
  email: string;
}

export default class UserModel {
  // আপনার কোড
}
```

### Redis Cache ব্যবহার
```javascript
// JavaScript (existing files)
const Cache = require('./app/core/Cache');

// Cache set
await Cache.set('user:1', userData, 3600);

// Cache get
const user = await Cache.get('user:1');

// Cache remember (auto-caching with callback)
const data = await Cache.remember('expensive-query', 300, async () => {
  return await db.query('SELECT * FROM large_table');
});

// Cache delete
await Cache.delete('user:1');
```

### TypeScript Cache ব্যবহার
```typescript
// TypeScript files
import cacheManager from '@core/CacheManager';

// Type-safe caching
const user = await cacheManager.get<User>('user:1');
await cacheManager.set('user:1', userData, { ttl: 3600 });
```

### Redis সার্ভিস সরাসরি ব্যবহার
```typescript
import redisService from '@core/RedisService';

// Connect on app startup
await redisService.connect();

// Direct Redis operations
await redisService.set('key', 'value', 3600);
const value = await redisService.get('key');
await redisService.del('key');

// Check connection status
if (redisService.isConnected()) {
  console.log('Redis is available');
}
```

## 🔧 npm Scripts আপডেট

TypeScript কম্পাইল এবং রান করার জন্য নতুন স্ক্রিপ্ট যুক্ত করুন `package.json`-এ:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node --test tests/*.test.js",
    "build:ts": "tsc",
    "dev:ts": "ts-node --require tsconfig-paths/register server.ts",
    "clean": "rm -rf dist"
  }
}
```

## 🐳 Docker Support (পরবর্তী ধাপ)

Redis সহ ডকার সাপোর্ট যুক্ত করতে `docker-compose.yml` তৈরি করুন:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - mysql
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: nodeflow_db
```

## 📊 পারফরম্যান্স উন্নতি

- **Redis Cache**: মেমরি-বেসড ক্যাশিংয়ের মাধ্যমে 10-100x ফাস্টার ডেটা এক্সেস
- **Hybrid System**: Redis অনুপলব্ধ হলেও অ্যাপ চলতে থাকবে (ফাইল ক্যাশ ফলব্যাক)
- **Type Safety**: TypeScript ব্যবহার করে বাগ কমানো এবং ডেভেলপমেন্ট স্পিড বাড়ানো

## ⚠️ গুরুত্বপূর্ণ নোট

1. **Redis ঐচ্ছিক**: Redis ইনস্টল না থাকলেও অ্যাপ চলবে (ফাইল-বেসড ক্যাশ ব্যবহার করবে)
2. **Backward Compatibility**: সব existing JavaScript ফাইল আগের মতোই কাজ করবে
3. **Gradual Migration**: আপনি ধীরে ধীরে TypeScript-এ মাইগ্রেট করতে পারেন

## 🎯 পরবর্তী উন্নয়নের পরামর্শ

1. **Dependency Injection Container** তৈরি করা
2. **Database Migrations & Seeding** সিস্টেম যুক্ত করা
3. **Rate Limiting** মিডেলওয়্যার উন্নত করা
4. **GraphQL** সাপোর্ট যুক্ত করা
5. **Unit Testing** ফ্রেমওয়ার্ক সেটআপ করা (Jest/Mocha)
6. **Docker** এবং **CI/CD** কনফিগারেশন তৈরি করা
