/**
 * NodeFlow Event System
 * Loose coupling এর জন্য ইভেন্ট ড্রিভেন আর্কিটেকচার
 */

class Event {
    constructor() {
        this.listeners = new Map();
        this.wildcardListeners = [];
    }

    /**
     * ইভেন্ট লিসেনার রেজিস্টার করা
     * @param {string} event - ইভেন্ট নাম
     * @param {Function} listener - কলব্যাক ফাংশন
     * @param {number} priority - প্রায়োরিটি (উচ্চ সংখ্যা = আগে এক্সিকিউট)
     */
    listen(event, listener, priority = 0) {
        if (event === '*') {
            this.wildcardListeners.push({ listener, priority });
            this.wildcardListeners.sort((a, b) => b.priority - a.priority);
            return;
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push({ listener, priority });
        this.listeners.get(event).sort((a, b) => b.priority - a.priority);
    }

    /**
     * ইভেন্ট ডিসপ্যাচ করা
     * @param {string} event - ইভেন্ট নাম
     * @param {any} payload - ডেটা পেলোড
     * @returns {Promise<any[]>} - সব লিসেনারের রিটার্ন ভ্যালু
     */
    async dispatch(event, payload) {
        const results = [];
        
        // ওয়াইল্ডকার্ড লিসেনার
        for (const { listener } of this.wildcardListeners) {
            try {
                results.push(await listener(event, payload));
            } catch (error) {
                console.error(`Wildcard listener error for ${event}:`, error);
            }
        }

        // নির্দিষ্ট ইভেন্ট লিসেনার
        if (this.listeners.has(event)) {
            for (const { listener } of this.listeners.get(event)) {
                try {
                    results.push(await listener(payload));
                } catch (error) {
                    console.error(`Listener error for ${event}:`, error);
                }
            }
        }

        return results;
    }

    /**
     * একবারের জন্য লিসেনার (Once)
     * @param {string} event 
     * @param {Function} listener 
     */
    once(event, listener) {
        const onceWrapper = async (payload) => {
            this.remove(event, onceWrapper);
            return await listener(payload);
        };
        this.listen(event, onceWrapper);
    }

    /**
     * লিসেনার রিমুভ করা
     * @param {string} event 
     * @param {Function} listener 
     */
    remove(event, listener) {
        if (event === '*') {
            this.wildcardListeners = this.wildcardListeners.filter(
                l => l.listener !== listener
            );
            return;
        }

        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            this.listeners.set(
                event,
                listeners.filter(l => l.listener !== listener)
            );
        }
    }

    /**
     * সব লিসেনার ক্লিয়ার করা
     */
    flush() {
        this.listeners.clear();
        this.wildcardListeners = [];
    }

    /**
     * চেক করা ইভেন্টের লিসেনার আছে কিনা
     */
    hasListeners(event) {
        return this.listeners.has(event) || 
               this.wildcardListeners.length > 0;
    }
}

module.exports = Event;
