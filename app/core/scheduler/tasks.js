/**
 * Scheduled Tasks Definition
 * এখানে সব শিডিউলড টাস্ক ডিফাইন করুন
 */

const scheduler = require('./Scheduler');
const DB = require('../database/DB');

// প্রতিদিন রাত ৩টায় ডেটাবেস ব্যাকআপ
scheduler.add(
    'daily-backup',
    '0 3 * * *', // প্রতিদিন ৩:০০ AM
    async () => {
        console.log('🔄 Starting daily database backup...');
        // এখানে ব্যাকআপ লজিক লিখুন
        // await BackupService.create();
        console.log('✅ Daily backup completed');
    },
    { timezone: 'Asia/Dhaka' }
);

// প্রতি সোমবার সকাল ৯টায় সাপ্তাহিক রিপোর্ট
scheduler.add(
    'weekly-report',
    '0 9 * * 1', // প্রতি সোমবার ৯:০০ AM
    async () => {
        console.log('📊 Generating weekly report...');
        // await ReportService.generateWeekly();
        console.log('✅ Weekly report generated');
    },
    { timezone: 'Asia/Dhaka' }
);

// প্রতি ঘণ্টায় সেশন ক্লিনআপ
scheduler.add(
    'hourly-session-cleanup',
    '0 * * * *', // প্রতি ঘণ্টা
    async () => {
        console.log('🧹 Cleaning up expired sessions...');
        // await SessionService.cleanup();
        console.log('✅ Sessions cleaned');
    }
);

// প্রতি ৫ মিনিটে হেলথ চেক
scheduler.add(
    'health-check',
    '*/5 * * * *', // প্রতি ৫ মিনিট
    async () => {
        const status = {
            database: await DB.connection().raw('SELECT 1').then(() => 'ok').catch(() => 'error'),
            timestamp: new Date().toISOString()
        };
        console.log('❤️ Health check:', status);
    }
);

module.exports = scheduler;
