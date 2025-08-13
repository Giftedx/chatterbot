// Jest manual mock for discord.js
// Provides minimal implementations required by tests without pulling in the full ESM discord.js library.

class Collection extends Map {
  constructor(iterable) { super(iterable); }
}

class EmbedBuilder {
  constructor() { this._data = { fields: [] }; }
  setColor(c) { this._data.color = c; return this; }
  setTitle(t) { this._data.title = t; return this; }
  setDescription(d) { this._data.description = d; return this; }
  addFields(...f) { this._data.fields.push(...f); return this; }
  setFooter(f) { this._data.footer = f; return this; }
  setTimestamp(ts = new Date()) { this._data.timestamp = ts; return this; }
  toJSON() { return this._data; }
}

class SlashCommandBuilder {
  constructor() {
    this.name = '';
    this.description = '';
    this.options = [];
  }
  setName(name) { this.name = name; return this; }
  setDescription(desc) { this.description = desc; return this; }
  addStringOption(cb) { const option = new CommandOption('string'); cb(option); this._pushOption(option); return this; }
  addAttachmentOption(cb) { const option = new CommandOption('attachment'); cb(option); this._pushOption(option); return this; }
  addBooleanOption(cb) { const option = new CommandOption('boolean'); cb(option); this._pushOption(option); return this; }
  _pushOption(option) {
    this.options = this.options || [];
    this.options.push({ name: option.name, description: option.description, required: option.required, type: option.type });
  }
  toJSON() { return { name: this.name, description: this.description, options: this.options }; }
}

class CommandOption {
  constructor(type) { this.type = type; }
  setName(name) { this.name = name; return this; }
  setDescription(desc) { this.description = desc; return this; }
  setRequired(val) { this.required = val; return this; }
}

class ChatInputCommandInteraction {
  constructor() {
    this.reply = jest.fn();
    this.followUp = jest.fn();
    this.deferReply = jest.fn();
    this.editReply = jest.fn();
    this.isRepliable = jest.fn(() => true);
    this.id = 'interaction_mock';
    this.channelId = 'channel_mock';
    this.guildId = 'guild_mock';
    this.client = {};
    this.channel = {};
    this.guild = {};
    this.member = {};
    this.createdTimestamp = Date.now();
  }
}

class ModalBuilder {
  constructor() { this._data = { components: [] }; }
  setCustomId(id) { this._data.custom_id = id; return this; }
  setTitle(title) { this._data.title = title; return this; }
  addComponents(...rows) { this._data.components.push(...rows); return this; }
}
class TextInputBuilder {
  constructor() { this._data = {}; }
  setCustomId(id) { this._data.custom_id = id; return this; }
  setLabel(l) { this._data.label = l; return this; }
  setStyle(s) { this._data.style = s; return this; }
  setRequired(r) { this._data.required = r; return this; }
  setMaxLength(m) { this._data.max_length = m; return this; }
  setPlaceholder(p) { this._data.placeholder = p; return this; }
}
const TextInputStyle = { Short: 1, Paragraph: 2 };

class ButtonBuilder {
  constructor() {
    this._data = { custom_id: '', label: '', style: 1 };
  }
  setCustomId(id) { this._data.custom_id = id; return this; }
  setLabel(label) { this._data.label = label; return this; }
  setStyle(style) { this._data.style = style; return this; }
  setEmoji(e) { this._data.emoji = e; return this; }
  setURL(u) { this._data.url = u; return this; }
  toJSON() { return this._data; }
}

class ActionRowBuilder {
  constructor() { this.components = []; }
  addComponents(...components) { this.components.push(...components); return this; }
  toJSON() { return { type: 1, components: this.components.map(c => c.toJSON ? c.toJSON() : c) }; }
}

const ButtonStyle = { Primary: 1, Secondary: 2, Success: 3, Danger: 4 };

class Attachment { constructor(data) { Object.assign(this, data); } }

module.exports = {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message: class {},
  Client: class {},
  GatewayIntentBits: {},
  REST: class {},
  Routes: {},
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  EmbedBuilder,
  Attachment,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
};
