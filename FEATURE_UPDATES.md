# 🚀 NodeFlow Framework - নতুন ফিচার আপডেট

## ✅ সম্পন্ন করা উন্নয়নসমূহ

### ১. **ইভেন্ট সিস্টেম (Event System)** 📡
Loose coupling আর্কিটেকচারের জন্য ইভেন্ট ড্রিভেন সিস্টেম।

**ফাইলসমূহ:**
- `app/core/events/Event.js` - মূল ইভেন্ট ক্লাস
- `app/core/events/EventFacade.js` - গ্লোবাল ইভেন্ট বাস
- `app/core/events/listeners.js` - ইভেন্ট লিসেনার উদাহরণ

**ব্যবহার:**
```javascript
const eventBus = require('./app/core/events/EventFacade');

// লিসেনার রেজিস্টার
eventBus.listen('user.registered', async (user) => {
    console.log(`Welcome ${user.email}`);
    // ইমেইল পাঠান, লগ রাখা ইত্যাদি
});

// ইভেন্ট ট্রিগার
await eventBus.dispatch('user.registered', userData);

// ওয়াইল্ডকার্ড লিসেনার (সব ইভেন্ট)
eventBus.listen('*', (eventName, payload) => {
    console.log(`Event: ${eventName}`);
});
```

**সুবিধা:**
- ✅ কোড লুজলি কাপল্ড থাকে
- ✅ একাধিক অ্যাকশন একসাথে
- ✅ সহজে এক্সটেন্ড করা যায়
- ✅ প্রায়োরিটি সাপোর্ট

---

### ২. **টাস্ক স্কেডিউলার (Task Scheduler)** ⏰
ক্রোন জব ম্যানেজমেন্টের জন্য (node-cron ভিত্তিক)।

**ফাইলসমূহ:**
- `app/core/scheduler/Scheduler.js` - মূল স্কেডিউলার ক্লাস
- `app/core/scheduler/tasks.js` - টাস্ক ডেফিনিশন

**ব্যবহার:**
```javascript
const scheduler = require('./app/core/scheduler/Scheduler');

// প্রতিদিন রাত ৩টায় ব্যাকআপ
scheduler.add(
    'daily-backup',
    '0 3 * * *',
    async () => {
        await BackupService.create();
    },
    { timezone: 'Asia/Dhaka' }
);

// টাস্ক লিস্ট দেখা
const tasks = scheduler.list();

// টাস্ক স্টপ/স্টার্ট
scheduler.stop('daily-backup');
scheduler.start('daily-backup');
```

**ক্রোন এক্সপ্রেশন উদাহরণ:**
- `* * * * *` - প্রতি মিনিটে
- `0 * * * *` - প্রতি ঘণ্টায়
- `0 3 * * *` - প্রতিদিন ৩টা AM
- `0 9 * * 1` - প্রতি সোমবার ৯টা AM
- `*/5 * * * *` - প্রতি ৫ মিনিটে

**পূর্বনির্ধারিত টাস্ক:**
- 🔄 Daily Database Backup (৩:০০ AM)
- 📊 Weekly Report (সোমবার ৯:০০ AM)
- 🧹 Hourly Session Cleanup
- ❤️ Health Check (প্রতি ৫ মিনিটে)

---

### ৩. **ফাইল স্টোরেজ ম্যানেজার (Storage Manager)** 📁
Local এবং AWS S3 সাপোর্ট সহ ইউনিফাইড ফাইল স্টোরেজ।

**ফাইলসমূহ:**
- `app/core/storage/Storage.js` - মূল স্টোরেজ ক্লাস

**ইনস্টল:**
```bash
npm install multer @aws-sdk/client-s3 uuid
```

**ব্যবহার:**
```javascript
const Storage = require('./app/core/storage/Storage');

// কনফিগারেশন
const storage = new Storage({
    driver: 'local', // or 's3'
    local: {
        root: './public/uploads',
        url: '/uploads'
    },
    s3: {
        bucket: 'my-bucket',
        region: 'us-east-1',
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET
    }
});

// মিডেলওয়্যার হিসেবে ব্যবহার
const upload = storage.upload({
    path: 'avatars',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    keepOriginalName: false
});

// রাউটে ব্যবহার
app.post('/upload', upload.single('avatar'), async (req, res) => {
    const fileUrl = req.file.path;
    res.json({ url: fileUrl });
});

// সরাসরি ফাইল অপারেশন
await storage.put('file.txt', 'content');
const content = await storage.get('file.txt');
await storage.delete('file.txt');
const exists = await storage.exists('file.txt');
const url = storage.url('file.txt');

// ড্রাইভার পরিবর্তন
storage.use('s3'); // S3 তে সুইচ
storage.use('local'); // Local এ সুইচ
```

**সাপোর্টেড ড্রাইভার:**
- ✅ Local File System
- ✅ AWS S3
- ✅ কাস্টম ড্রাইভার যোগ করার সুযোগ

---

### ৪. **ফর্ম রিকোয়েস্ট ভ্যালিডেশন (Form Request)** ✔️
Laravel-এর মতো শক্তিশালী ভ্যালিডেশন সিস্টেম।

**ফাইলসমূহ:**
- `app/http/requests/FormRequest.js` - বেস ক্লাস
- `app/http/requests/RegisterUserRequest.js` - উদাহরণ

**ব্যবহার:**
```javascript
const FormRequest = require('./app/http/requests/FormRequest');

class CreateUserRequest extends FormRequest {
    rules() {
        return {
            name: 'required|string|min:3|max:50',
            email: 'required|email|unique:users',
            password: 'required|string|min:8|confirmed',
            age: 'required|integer|min:18|max:100',
            status: 'required|in:active,inactive,pending'
        };
    }

    messages() {
        return {
            'email.required': 'Email address is mandatory',
            'password.min': 'Password must be at least 8 characters'
        };
    }

    attributes() {
        return {
            email: 'Email Address',
            password: 'Password'
        };
    }
}

// কন্ট্রোলারে ব্যবহার
app.post('/users', async (req, res) => {
    try {
        const request = new CreateUserRequest(req.body);
        const validated = await request.validate();
        
        // ভ্যালিডেটেড ডেটা ব্যবহার করুন
        await User.create(validated);
        
        res.json({ success: true, data: validated });
    } catch (error) {
        if (error.status === 422) {
            return res.status(422).json({
                success: false,
                errors: error.errors
            });
        }
        throw error;
    }
});
```

**সাপোর্টেড রুলস:**
- `required`, `string`, `integer`, `number`, `boolean`
- `email`, `url`, `alpha`, `alphanumeric`
- `min`, `max`, `between`
- `in`, `notIn`, `array`, `json`
- `date`, `after`, `before`
- `regex`, `digits`, `digitsBetween`
- `ip`, `uuid`
- `unique`, `exists` (ডেটাবেস চেক)
- `confirmed`, `nullable`

---

### ৫. **JWT অথেন্টিকেশন (API Tokens)** 🔐
মোবাইল অ্যাপ এবং SPA-র জন্য টোকেন ভিত্তিক অথেন্টিকেশন।

**ফাইলসমূহ:**
- `app/middleware/JwtAuth.js` - JWT মিডেলওয়্যার

**ইনস্টল:**
```bash
npm install jsonwebtoken
```

**ব্যবহার:**
```javascript
const jwtAuth = require('./app/middleware/JwtAuth');

// টোকেন জেনারেট (লগিনের পর)
app.post('/login', async (req, res) => {
    const user = await authenticateUser(req.body);
    
    if (user) {
        const token = jwtAuth.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        }, {
            expiresIn: '24h'
        });
        
        res.json({
            success: true,
            token,
            user: { id: user.id, email: user.email }
        });
    }
});

// প্রোটেক্টেড রাউট
app.get('/profile', 
    (req, res, next) => jwtAuth.handle(req, res, next),
    async (req, res) => {
        // req.user এ ইউজার ডেটা পাওয়া যাবে
        res.json({ user: req.user });
    }
);

// টোকেন রিফ্রেশ
app.post('/refresh-token', async (req, res) => {
    const oldToken = req.body.token;
    const newToken = jwtAuth.refreshToken(oldToken);
    res.json({ token: newToken });
});

// টোকেন ভেরিফাই
const isValid = !jwtAuth.isTokenExpired(token);
```

**ফিচারসমূহ:**
- ✅ Bearer Token সাপোর্ট
- ✅ Query/Cookie/Body থেকে টোকেন এক্সট্রাক্ট
- ✅ অটোমেটিক এক্সপায়ারি চেক
- ✅ টোকেন রিফ্রেশ
- ✅ কাস্টমizable সিক্রেট এবং এক্সপায়ারি

---

## 🔧 কনফিগারেশন আপডেট

### `.env.example` তে যুক্ত হয়েছে:
```env
# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=24h

# AWS S3 (Optional)
AWS_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Scheduler Timezone
APP_TIMEZONE=Asia/Dhaka
```

---

## 📦 নতুন ডিপেন্ডেন্সি

```json
{
  "dependencies": {
    "node-cron": "^3.0.0",
    "multer": "^1.4.5-lts.1",
    "@aws-sdk/client-s3": "^3.0.0",
    "jsonwebtoken": "^9.0.0",
    "uuid": "^9.0.0"
  }
}
```

---

## 🎯 ব্যবহারের উদাহরণ

### ইভেন্ট সিস্টেম দিয়ে ইউজার রেজিস্ট্রেশন:
```javascript
// routes/auth.js
const eventBus = require('../app/core/events/EventFacade');

app.post('/register', async (req, res) => {
    const request = new RegisterUserRequest(req.body);
    const validated = await request.validate();
    
    const user = await User.create(validated);
    
    // ইভেন্ট ডিসপ্যাচ
    await eventBus.dispatch('user.registered', user);
    
    res.json({ success: true, user });
});
```

### স্টোরেজ দিয়ে ফাইল আপলোড:
```javascript
// routes/upload.js
const storage = new Storage({ driver: 'local' });
const upload = storage.upload({
    path: 'documents',
    maxSize: 10 * 1024 * 1024
});

app.post('/upload', 
    upload.single('file'),
    jwtAuth.handle,
    async (req, res) => {
        res.json({
            url: req.file.path,
            size: req.file.size
        });
    }
);
```

### স্কেডিউলার দিয়ে অটোমেটেড কাজ:
```javascript
// app.js
const scheduler = require('./app/core/scheduler/tasks');

// অ্যাপ শুরু হলে স্কেডিউলার চালু
scheduler.startAll();

// graceful shutdown
process.on('SIGTERM', () => {
    scheduler.stopAll();
    process.exit(0);
});
```

---

## 📈 পারফরম্যান্স এবং স্কেলেবিলিটি

| ফিচার | সুবিধা |
|--------|--------|
| Event System | Loose coupling, সহজে এক্সটেনশন |
| Scheduler | অটোমেটেড ব্যাকগ্রাউন্ড টাস্ক |
| Storage | মাল্টি-ড্রাইভার, ক্লাউড রেডি |
| Validation | কন্ট্রোলার ক্লিন রাখা |
| JWT | স্টেটলেস অথেন্টিকেশন, স্কেলেবল |

---

## 🚀 পরবর্তী পদক্ষেপ

1. **ইভেন্ট লিসেনার** আপনার প্রয়োজন অনুযায়ী কাস্টমাইজ করুন
2. **স্কেডিউলড টাস্ক** সংজ্ঞায়িত করুন (`tasks.js`)
3. **Storage Driver** কনফিগার করুন (Local বা S3)
4. **Validation Rules** আপনার ফর্মের জন্য তৈরি করুন
5. **JWT Middleware** প্রোটেক্টেড রাউটে যুক্ত করুন

---

## 📝 নোট

- সব ফিচার backward compatible
- existing কোডে কোনো প্রভাব নেই
- ধীরে ধীরে নতুন ফিচার ব্যবহার শুরু করুন
- Production এ ব্যবহারের আগে `.env` সেটিংস ঠিক করে নিন

**Happy Coding! 🎉**
