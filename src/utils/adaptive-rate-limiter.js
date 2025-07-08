
// Wrapper to allow CommonJS (Jest) to import TS implementation
// eslint-disable-next-line @typescript-eslint/no-var-requires
// Register ts-node for .ts require in tests if not already
try {
  require('ts-node/register/transpile-only');
} catch {}
const mod = require('./adaptive-rate-limiter.ts');
const ctor = mod.AdaptiveRateLimiter ?? mod.default ?? mod;
module.exports = ctor;
module.exports.default = ctor;
module.exports.AdaptiveRateLimiter = ctor;


  

