/**
 * NodeFlow Event Facade
 * গ্লোবাল ইভেন্ট বাস এক্সেস করার জন্য
 */

const Event = require('./Event');

// সিঙ্গেলটন ইন্সট্যান্স
const eventBus = new Event();

module.exports = eventBus;
