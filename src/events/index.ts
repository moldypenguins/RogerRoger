/**
 * @name index.ts
 * @version 2026-01-13
 * @summary Event handlers
 **/
"use strict"

import type { DiscordEvent } from "../types/index.js"
import ClientReady from "./ClientReady.js"
import GuildCreate from "./GuildCreate.js"
import GuildMemberAdd from "./GuildMemberAdd.js"
import GuildMemberRemove from "./GuildMemberRemove.js"
import GuildMemberUpdate from "./GuildMemberUpdate.js"
import InteractionCreate from "./InteractionCreate.js"
import MessageCreate from "./MessageCreate.js"
import VoiceStateUpdate from "./VoiceStateUpdate.js"

/**
 * Strongly typed collection of Discord event handlers
 */
const DiscordEvents: Record<string, DiscordEvent> = {
  ClientReady,
  GuildCreate,
  GuildMemberAdd,
  GuildMemberRemove,
  GuildMemberUpdate,
  InteractionCreate,
  MessageCreate,
  VoiceStateUpdate
} as const

export default DiscordEvents
