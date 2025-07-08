// Shim re-export for Jest tests that import '../utils/rate-limiter.js' from within `src/services/**` folders.
// Redirects to the main adaptive rate limiter implementation two directories up.
module.exports = require('../../utils/rate-limiter');
