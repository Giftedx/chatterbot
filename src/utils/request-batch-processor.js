// Wrapper to allow CommonJS (Jest) to import TS implementation
// eslint-disable-next-line @typescript-eslint/no-var-requires
try {
  // Ensure TS files can be required without precompilation in Jest/Node
  require('ts-node/register/transpile-only');
} catch (e) {
  /* istanbul ignore next -- ts-node already registered */
}
const mod = require('./request-batch-processor.ts');
const ctor =
  mod.RequestBatchProcessor ||
  (mod.default && mod.default.RequestBatchProcessor) ||
  mod.default ||
  mod;
module.exports = ctor;
module.exports.default = ctor;
module.exports.RequestBatchProcessor = ctor;
