// Bridge file so that imports ending with "../config/cache-policies.js" resolve correctly
// in both Jest (ts-jest) and transpiled builds, while keeping the real implementation
// in TypeScript (cache-policies.ts).

// eslint-disable-next-line @typescript-eslint/no-var-requires
// Bridge to TypeScript implementation. Allows Jest tests to mock this path.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const impl = require('./cache-policies.ts');

module.exports = {
  // Named export
  CachePolicyManager: impl.CachePolicyManager || impl.default,
  // Spread other exports (e.g., interfaces, helpers)
  ...impl,
  // Default export
  default: impl.default || impl.CachePolicyManager
};
