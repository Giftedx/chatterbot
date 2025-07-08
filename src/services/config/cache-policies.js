// Shim re-export for Jest tests importing "../config/cache-policies.js" from within service files
class CachePolicyManager {
  evaluatePolicy() {
    return { ttl: 300, name: 'test-policy' };
  }
}
// Support both named and default exports for compatibility with ESM and CommonJS consumers
module.exports = {
  CachePolicyManager,
  default: CachePolicyManager
};
