// Wrapper to allow importing .ts implementation from CommonJS environments (Jest)
// eslint-disable-next-line @typescript-eslint/no-var-requires
try {
  require('ts-node/register/transpile-only');
} catch {}
const mod = require('./streaming-processor.ts');
const ctor = mod.StreamingResponseProcessor ?? mod.default ?? mod;
module.exports = ctor;
module.exports.default = ctor;
module.exports.StreamingResponseProcessor = ctor;
