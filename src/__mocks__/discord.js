// Jest manual mock for discord.js
// Provides minimal implementations required by tests without pulling in the full ESM discord.js library.

class SlashCommandBuilder {
  constructor() {
    this.name = '';
    this.description = '';
    this.options = [];
  }
  setName(name) {
    this.name = name; return this;
  }
  setDescription(desc) {
    this.description = desc; return this;
  }
  addStringOption(cb) {
    const option = new CommandOption();
    cb(option);
    this.options = this.options || [];
    this.options.push({ name: option.name, description: option.description, required: option.required, type: 'string' });
    return this;
  }
  toJSON() {
    return { name: this.name, description: this.description, options: this.options };
  }
}

class CommandOption {
  setName(name) { this.name = name; return this; }
  setDescription(desc) { this.description = desc; return this; }
  setRequired(val) { this.required = val; return this; }
}

class ChatInputCommandInteraction {
  constructor() {
    this.reply = jest.fn();
    this.followUp = jest.fn();
  }
}

module.exports = {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message: class {},
  Client: class {},
  GatewayIntentBits: {},
  REST: class {},
  Routes: {},
};
