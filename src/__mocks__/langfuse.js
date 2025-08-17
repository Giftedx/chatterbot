// Jest manual mock for 'langfuse' to avoid dynamic import requirements in tests

class MockLangfuse {
  constructor() {}
  trace(args) {
    return { update: () => {}, ...args };
  }
  generation(args) {
    return { update: () => {}, ...args };
  }
  span(args) {
    return { update: () => {}, ...args };
  }
  event(args) {
    return { ...args };
  }
  score(args) {
    return { ...args };
  }
  async flushAsync() {}
}

module.exports = { Langfuse: MockLangfuse };
