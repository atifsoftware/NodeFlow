/**
 * NodeFlow Task Scheduler
 * ক্রোন জব ম্যানেজমেন্টের জন্য (node-cron based)
 */

const cron = require('node-cron');

class Scheduler {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
    }

    /**
     * শিডিউলড টাস্ক যোগ করা
     * @param {string} name - টাস্ক নাম
     * @param {string} cronExpression - ক্রোন এক্সপ্রেশন
     * @param {Function} task - টাস্ক ফাংশন
     * @param {Object} options - অপশনস
     */
    add(name, cronExpression, task, options = {}) {
        if (this.jobs.has(name)) {
            throw new Error(`Task "${name}" already exists`);
        }

        const scheduledTask = cron.schedule(cronExpression, async () => {
            try {
                console.log(`⏰ Running scheduled task: ${name}`);
                await task();
                console.log(`✅ Task completed: ${name}`);
            } catch (error) {
                console.error(`❌ Task failed: ${name}`, error);
                if (options.onError) {
                    await options.onError(error);
                }
            }
        }, {
            scheduled: options.scheduled !== false,
            timezone: options.timezone || 'UTC'
        });

        this.jobs.set(name, {
            task: scheduledTask,
            cronExpression,
            createdAt: new Date()
        });

        console.log(`📅 Scheduled task "${name}" with cron: ${cronExpression}`);
        return this;
    }

    /**
     * টাস্ক রিমুভ করা
     * @param {string} name 
     */
    remove(name) {
        if (!this.jobs.has(name)) {
            throw new Error(`Task "${name}" not found`);
        }

        const job = this.jobs.get(name);
        job.task.stop();
        this.jobs.delete(name);
        console.log(`🗑️ Removed task: ${name}`);
        return this;
    }

    /**
     * টাস্ক স্টপ করা (পরে আবার চালু করা যাবে)
     * @param {string} name 
     */
    stop(name) {
        if (!this.jobs.has(name)) {
            throw new Error(`Task "${name}" not found`);
        }
        this.jobs.get(name).task.stop();
        console.log(`⏸️ Stopped task: ${name}`);
        return this;
    }

    /**
     * টাস্ক শুরু করা
     * @param {string} name 
     */
    start(name) {
        if (!this.jobs.has(name)) {
            throw new Error(`Task "${name}" not found`);
        }
        this.jobs.get(name).task.start();
        console.log(`▶️ Started task: ${name}`);
        return this;
    }

    /**
     * সব টাস্ক বন্ধ করা
     */
    stopAll() {
        for (const [name, job] of this.jobs) {
            job.task.stop();
        }
        this.isRunning = false;
        console.log('🛑 All scheduled tasks stopped');
        return this;
    }

    /**
     * সব টাস্ক চালু করা
     */
    startAll() {
        for (const [name, job] of this.jobs) {
            job.task.start();
        }
        this.isRunning = true;
        console.log('▶️ All scheduled tasks started');
        return this;
    }

    /**
     * টাস্ক লিস্ট দেখা
     */
    list() {
        const tasks = [];
        for (const [name, job] of this.jobs) {
            tasks.push({
                name,
                cronExpression: job.cronExpression,
                running: job.task.getStatus() === 'scheduled',
                createdAt: job.createdAt
            });
        }
        return tasks;
    }

    /**
     * টাস্ক স্ট্যাটাস চেক করা
     * @param {string} name 
     */
    getStatus(name) {
        if (!this.jobs.has(name)) {
            return null;
        }
        const job = this.jobs.get(name);
        return {
            name,
            cronExpression: job.cronExpression,
            running: job.task.getStatus() === 'scheduled',
            createdAt: job.createdAt
        };
    }
}

// সিঙ্গেলটন ইন্সট্যান্স
const scheduler = new Scheduler();

module.exports = scheduler;
