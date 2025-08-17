// Type-only mock for discord.js to ease TS constraints in tests
// This file shadows the 'discord.js' module typings when mapped via jest moduleNameMapper
// and allows using simple Map/objects in tests instead of Collection and complex channel types.
declare module 'discord.js' {
  export type Snowflake = string;

  // Minimal Collection implementation for tests
  export class Collection<K, V> extends Map<K, V> {}

  // Core user and client types (minimal)
  export interface User {
    id: Snowflake;
    username?: string;
    bot?: boolean;
  toString: () => string;
    createDM: () => Promise<TextBasedChannel>;
  }

  export interface ClientUser extends User {}
  export class Client {
    constructor(options?: any);
    user?: ClientUser;
    on: (event: string, listener: (...args: any[]) => void) => this;
    once: (event: string, listener: (...args: any[]) => void) => this;
    destroy: () => void;
    login?: (token: string) => Promise<void>;
  }

  // Common constants/classes used in index.ts
  export const GatewayIntentBits: Record<string, number>;
  export class REST {
    constructor(options?: any);
    setToken: (token: string) => this;
    put: (route: string, body: any) => Promise<any>;
  }
  export const Routes: {
    applicationCommands: (clientId: string) => string;
  };

  // Attachments
  export interface Attachment {
    id: Snowflake;
    contentType?: string | null;
    url: string;
    name?: string;
    size?: number;
  }

  // Channels
  export interface TextThreadManager {
    create: (options: { name: string; autoArchiveDuration?: number; reason?: string }) => Promise<{ id: string; send: (msg: any) => Promise<any> }>;
  }

  export interface TextBasedChannel {
    id: string;
    isTextBased: () => boolean;
    isThread: () => boolean;
    type?: string;
    send: (message: any) => Promise<any>;
    sendTyping: () => Promise<void> | void;
    awaitMessages: (options: any) => Promise<Collection<string, Message>>;
    threads: TextThreadManager;
    messages?: { fetch: (options: any) => Promise<any> };
  }

  export interface Channel { id: string }

  export interface MessageReference { messageId?: string }

  export interface Mentions {
    users?: Collection<string, User>;
    has?: (user: User) => boolean;
  }

  // Minimal Message shape used in the codebase
  export interface Message<InGuild extends boolean = boolean> {
    id: string;
    channel: TextBasedChannel;
    channelId: string;
    guildId?: string | null;
    author: User;
    client: Client;
    attachments: Map<string, Attachment> | Collection<string, Attachment>;
    content: string;
    mentions?: Mentions;
    reference?: MessageReference;
    fetchReference: () => Promise<Message>;
    reply: (options: any) => Promise<any>;
  }

  // Interactions
  export interface BaseInteraction {
    id: string;
    isChatInputCommand: () => boolean;
    isButton: () => boolean;
    isCommand?: () => boolean;
    isModalSubmit?: () => boolean;
    isRepliable: () => boolean;
    deferred?: boolean;
    replied?: boolean;
    customId?: string;
    reply: (options: any) => Promise<any>;
    editReply: (options: any) => Promise<any>;
    followUp: (options: any) => Promise<any>;
  }

  export type Interaction = BaseInteraction;

  export interface ChatInputCommandInteraction extends BaseInteraction {
    commandName: string;
    user: User;
    channel?: TextBasedChannel;
    channelId: string;
    guildId?: string | null;
    options: { getString: (name: string) => string | null };
    deferReply: (options?: any) => Promise<any>;
  }

  export interface ButtonInteraction extends BaseInteraction {
    user: User;
    channel?: TextBasedChannel;
    channelId: string;
    guildId?: string | null;
    customId: string;
    message: any;
    update: (options: any) => Promise<any>;
    deferReply: (options?: any) => Promise<any>;
  }

  export interface ModalSubmitInteraction extends BaseInteraction {
    customId: string;
    user: User;
    fields: { getTextInputValue: (id: string) => string };
  }

  // Slash command builder (extremely minimal chainable builder)
  export class SlashCommandBuilder {
    private _name: string = '';
    private _description: string = '';
    setName(name: string): this { this._name = name; return this; }
    setDescription(desc: string): this { this._description = desc; return this; }
  }

  // UI builders and styles
  export class ButtonBuilder {
    setCustomId(id: string): this;
    setLabel(label: string): this;
    setStyle(style: number): this;
    setEmoji(emoji: string): this;
    setURL(url: string): this;
    toJSON(): any;
  }

  export class ActionRowBuilder<T = any> {
    addComponents(...components: T[]): this;
    toJSON(): any;
  }

  export const ButtonStyle: { Primary: number; Secondary: number; Success: number; Danger: number; Link?: number };

  export class EmbedBuilder {
    setColor(c: string | number): this;
    setTitle(t: string): this;
    setDescription(d: string): this;
    addFields(...f: Array<{ name: string; value: string; inline?: boolean }>): this;
    setFooter(f: { text: string }): this;
    setTimestamp(ts?: Date): this;
    toJSON(): any;
  }

  export class ModalBuilder {
    setCustomId(id: string): this;
    setTitle(title: string): this;
    addComponents(...rows: any[]): this;
  }

  export class TextInputBuilder {
    setCustomId(id: string): this;
    setLabel(l: string): this;
    setStyle(s: number): this;
    setRequired(r: boolean): this;
    setMaxLength(m: number): this;
    setPlaceholder(p: string): this;
  }

  export const TextInputStyle: { Short: number; Paragraph: number };

  // Misc types
  export interface MessageEditOptions {
    content?: string;
    components?: any;
  }

  // Guild member (minimal for RBAC sync)
  export interface GuildMember {
    id: string;
    guild: { id: string };
    roles: { cache: Collection<string, { id: string; name?: string }> };
    permissions: { has: (perm: string) => boolean };
  }
}
