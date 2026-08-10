/**
 * User Registered Event Listener
 * উদাহরণ: ইউজার রেজিস্ট্রেশনের পর ইমেইল পাঠানো
 */

const eventBus = require('./EventFacade');

// ইভেন্ট লিসেনার রেজিস্টার করা
eventBus.listen('user.registered', async (user) => {
    console.log(`📧 Welcome email sending to: ${user.email}`);
    // এখানে ইমেইল সার্ভিস কল করুন
    // await MailService.sendWelcome(user);
});

// লগিং ইভেন্ট
eventBus.listen('user.registered', async (user) => {
    console.log(`📝 New user registered: ${user.username} (${user.email})`);
    // এখানে লগ সার্ভিস কল করুন
    // await LogService.info('User registered', { userId: user.id });
});

// ওয়াইল্ডকার্ড লিসেনার (সব ইভেন্ট লগ করবে)
eventBus.listen('*', async (eventName, payload) => {
    console.log(`🔔 Event fired: ${eventName}`);
});

module.exports = eventBus;
