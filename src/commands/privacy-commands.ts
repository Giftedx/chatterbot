/**
 * Privacy and Data Management Commands
 * Discord compliance commands for user privacy and data control
 */

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  DMChannel,
  Interaction
} from 'discord.js';
import { UserConsentService } from '../services/user-consent.service.js';
import { logger } from '../utils/logger.js';

const userConsentService = UserConsentService.getInstance();

// Retain only UI handlers; no commands are exported anymore per single-command policy.
export async function handlePrivacyModalSubmit(_interaction?: Interaction): Promise<void> { /* no-op */ }
export async function handlePrivacyButtonInteraction(_interaction?: Interaction): Promise<void> { /* no-op */ }