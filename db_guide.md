# NodeFlow Fluent Query Builder (config/db.js) ব্যবহার নির্দেশিকা

NodeFlow-এর উন্নত Fluent Query Builder-টি আপনার ডাটাবেস অপারেশনগুলোকে আরও সহজ, সুরক্ষিত এবং সংক্ষিপ্ত করতে ডিজাইন করা হয়েছে। নিচে এর বিভিন্ন ফিচার ও ব্যবহারের বিস্তারিত উদাহরণ দেওয়া হলো।

---

## সূচিপত্র
১. [মৌলিক কুয়েরি (Basic Queries)](#১-মৌলিক-কুয়েরি-basic-queries)
২. [হোয়্যার শর্তাবলী (Where Conditions)](#২-হোয়্যার-শর্তাবলী-where-conditions)
৩. [নেস্টেড কুয়েরি ক্লোজার (Nested Query Closures)](#৩-নেস্টেড-কুয়েরি-ক্লোজার-nested-query-closures)
৪. [টেবিল জয়েন (Table Joins)](#৪-টেবিল-জয়েন-table-joins)
৫. [এগ্রিগেট ফাংশনসমূহ (Aggregates)](#৫-এগ্রিগেট-ফাংশনসমূহ-aggregates)
৬. [ইউটিলিটি ও ম্যাথ মেথডস (Utility & Math Methods)](#৬-ইউটিলিটি-ও-ম্যাথ-মেথডস-utility--math-methods)
৭. [কন্ডিশনাল কুয়েরি (Conditional Queries)](#৭-কন্ডিশনাল-কুয়েরি-conditional-queries)
৮. [কুয়েরি ডিবাগিং (Query Debugging)](#৮-কুয়েরি-ডিবাগিং-query-debugging)
৯. [ডাটাবেস ট্রানজেকশন (Database Transactions)](#৯-ডাটাবেস-ট্রানজেকশন-database-transactions)

---

## ১. মৌলিক কুয়েরি (Basic Queries)

### ডাটাবেস থেকে সব রেকর্ড নিয়ে আসা (`get`)
```javascript
const DB = require('./config/db');

// SELECT * FROM `products`
const products = await DB.table('products').get();
```

### নির্দিষ্ট কলাম সিলেক্ট করা (`select`)
```javascript
// SELECT `id`, `name`, `price` FROM `products`
const products = await DB.table('products')
  .select(['id', 'name', 'price'])
  .get();
```

### প্রথম একটি মাত্র রেকর্ড আনা (`first`)
```javascript
// SELECT * FROM `products` LIMIT 1
const product = await DB.table('products')
  .where('sku', 'NP-EXT-665')
  .first();
```

---

## ২. হোয়্যার শর্তাবলী (Where Conditions)

### সাধারণ হোয়্যার (`where`)
```javascript
// SELECT * FROM `products` WHERE `price` > 50
const products = await DB.table('products')
  .where('price', '>', 50)
  .get();

// ডিফল্ট অপারেটর সমান (=) বিবেচনা করে
// SELECT * FROM `products` WHERE `category` = 'Tablet'
const products = await DB.table('products')
  .where('category', 'Tablet')
  .get();
```

### অথবা শর্ত বা অর-হোয়্যার (`orWhere`)
```javascript
// SELECT * FROM `products` WHERE `category` = 'Tablet' OR `price` < 10
const products = await DB.table('products')
  .where('category', 'Tablet')
  .orWhere('price', '<', 10)
  .get();
```

### হোয়্যার ইন (`whereIn` / `whereNotIn`)
```javascript
// SELECT * FROM `products` WHERE `category` IN ('Capsule', 'Syrup')
const products = await DB.table('products')
  .whereIn('category', ['Capsule', 'Syrup'])
  .get();
```

### হোয়্যার নাল (`whereNull` / `whereNotNull`)
```javascript
// SELECT * FROM `products` WHERE `expiry_date` IS NULL
const activeProducts = await DB.table('products')
  .whereNull('expiry_date')
  .get();
```

### হোয়্যার বিটুইন (`whereBetween`)
```javascript
// SELECT * FROM `products` WHERE `price` BETWEEN 10 AND 100
const products = await DB.table('products')
  .whereBetween('price', [10, 100])
  .get();
```

### হোয়্যার লাইক সার্চ (`whereLike` / `orWhereLike`)
```javascript
// SELECT * FROM `products` WHERE `name` LIKE '%Napa%'
const searchResults = await DB.table('products')
  .whereLike('name', '%Napa%')
  .get();
```

---

## ৩. নেস্টেড কুয়েরি ক্লোজার (Nested Query Closures)

জটিল এবং বন্ধনীযুক্ত হোয়্যার লজিক যেমন `WHERE status = 'active' AND (price > 100 OR stock > 0)` তৈরি করতে ফাংশন ক্লোজার ব্যবহার করতে পারেন:

```javascript
const products = await DB.table('products')
  .where('status', 'active')
  .where(q => {
    q.where('price', '>', 100)
     .orWhere('stock', '>', 0);
  })
  .get();
```

---

## ৪. টেবিল জয়েন (Table Joins)

একাধিক টেবিলের মধ্যে রিলেশন তৈরি করে তথ্য নিয়ে আসার জন্য `join` এবং `leftJoin` সমর্থিত:

```javascript
// SELECT products.*, categories.name AS category_title 
// FROM `products` 
// INNER JOIN `categories` ON `products.category_id` = `categories.id`
const products = await DB.table('products')
  .select('products.*, categories.name AS category_title')
  .join('categories', 'products.category_id', '=', 'categories.id')
  .get();
```

---

## ৫. এগ্রিগেট ফাংশনসমূহ (Aggregates)

ডাটা প্রসেসিং সহজ করতে কুয়েরি বিল্ডারে বিল্ট-ইন গাণিতিক মেথড যুক্ত রয়েছে:

```javascript
// মোট রেকর্ড সংখ্যা গোনা
const totalProducts = await DB.table('products').count();

// কোনো নির্দিষ্ট কলামের মানের সমষ্টি বের করা
const totalAssetValue = await DB.table('products').sum('price');

// গড় মান হিসাব করা
const averagePrice = await DB.table('products').avg('price');
```

---

## ৬. ইউটিলিটি ও ম্যাথ মেথডস (Utility & Math Methods)

### রেকর্ড সংখ্যা বাড়ানো/কমানো (`increment` / `decrement`)
```javascript
// নির্দিষ্ট প্রোডাক্টের স্টক ১ বৃদ্ধি করা
await DB.table('products')
  .where('id', 5)
  .increment('quantity', 1);

// নির্দিষ্ট প্রোডাক্টের স্টক ১০ কমানো
await DB.table('products')
  .where('id', 2)
  .decrement('quantity', 10);
```

### গ্রুপিং এবং হ্যাভিং (`groupBy` / `having`)
```javascript
// SELECT `category`, COUNT(*) AS total FROM `products` GROUP BY `category` HAVING `total` > 2
const categories = await DB.table('products')
  .select('category, COUNT(*) AS total')
  .groupBy('category')
  .having('total', '>', 2)
  .get();
```

---

## ७. কন্ডিশনাল কুয়েরি (Conditional Queries)

ইউজার ইনপুটের ওপর ভিত্তি করে ডাইনামিক ফিল্টারিং করতে `when()` মেথড ব্যবহার করা যায়:

```javascript
const userSearchInput = 'Napa';

const products = await DB.table('products')
  .when(userSearchInput, (q, value) => {
    // ইনপুট সত্য হলে কেবল তখনই এই কন্ডিশনটি কুয়েরিতে যুক্ত হবে
    q.whereLike('name', `%${value}%`);
  })
  .get();
```

---

## ৮. কুয়েরি ডিবাগিং (Query Debugging)

ডাটাবেসে কুয়েরি এক্সিকিউট হওয়ার আগে SQL কুয়েরি এবং প্যারামিটার ভ্যালুগুলো দেখতে নিচের দুটি মেথড ব্যবহার করুন:

```javascript
const query = DB.table('products')
  .where('category', 'Capsule')
  .where('price', '>', 50);

// ১. কম্পাইল করা SQL স্ট্রিং প্রিন্ট করুন
console.log(query.toSql()); 
// Output: SELECT * FROM `products` WHERE `category` = ? AND `price` > ?

// ২. বাইন্ডিং ভ্যালু বা প্যারামিটার দেখতে
console.log(query.getBindings()); 
// Output: [ 'Capsule', 50 ]
```

---

## ৯. ডাটাবেস ট্রানজেকশন (Database Transactions)

একাধিক ডাটাবেস রিকোয়েস্ট একসাথে নিরাপদভাবে পরিচালনা করতে এবং কোনো ভুল হলে তা রোলব্যাক করতে এটি ব্যবহৃত হয়। ডাটাবেস ট্রানজেকশন ২ ভাবে করা যায়:

### পদ্ধতি ১: অটোমেটেড ট্রানজেকশন (`DB.transaction` কলব্যাক - রিকমেন্ডেড)
এই পদ্ধতিতে সেশন কানেকশন এবং রোলব্যাক/কমিট বিল্ড-ইন হ্যান্ডেল হয়:
```javascript
try {
  await DB.transaction(async (trx) => {
    // ১. প্রথম টেবিল অপারেশন (trx ব্যবহার করতে হবে)
    await trx.table('orders').insert({ customer_id: 1, total: 500 });
    
    // ২. দ্বিতীয় টেবিল স্টক কমানো (trx ব্যবহার করতে হবে)
    await trx.table('products')
      .where('id', 3)
      .decrement('stock', 1);
  });
  console.log('Transaction successfully committed.');
} catch (error) {
  console.error('Transaction rolled back due to error:', error);
}
```

### পদ্ধতি ২: ম্যানুয়াল ট্রানজেকশন (`DB.beginTransaction`)
ম্যানুয়াল পদ্ধতিতে অবশ্যই প্রতিটি কুয়েরিতে `connection` অবজেক্টটি আর্গুমেন্ট হিসেবে পাস করতে হবে। অন্যথায় কুয়েরিগুলো ট্রানজেকশনের বাইরে রান হবে এবং রোলব্যাক কাজ করবে না:
```javascript
const connection = await DB.beginTransaction();

try {
  // ১. প্রথম টেবিল অপারেশন (কানেকশন অবজেক্ট সরাসরি পাস করা আবশ্যক)
  await DB.table('orders', connection).insert({ customer_id: 1, total: 500 });
  
  // ২. দ্বিতীয় টেবিল স্টক কমানো (কানেকশন অবজেক্ট সরাসরি পাস করা আবশ্যক)
  await DB.table('products', connection)
    .where('id', 3)
    .decrement('stock', 1);

  // সব কুয়েরি সফল হলে ডাটাবেসে সেভ করুন
  await connection.commit();
  console.log('Transaction successfully committed.');
} catch (error) {
  // কোনো ভুল হলে সব কুয়েরি বাতিল করুন এবং কানেকশন রিলিজ করুন
  await connection.rollback();
  console.error('Transaction rolled back due to error:', error);
} finally {
  connection.release();
}
```
```
