const { AsyncLocalStorage } = require('async_hooks');

/**
 * NodeFlow Request Context Store
 * Uses AsyncLocalStorage to maintain session and request data globally
 * across asynchronous execution chains, avoiding manual prop-drilling.
 */
const requestContext = new AsyncLocalStorage();

module.exports = requestContext;
