// Auto-mock for `./persona-manager.js` imports inside services
module.exports = {
  getActivePersona: jest.fn(() => ({
    name: 'Test Assistant',
    systemPrompt: 'You are a helpful assistant.'
  }))
};
