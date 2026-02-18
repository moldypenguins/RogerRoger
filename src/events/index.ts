/**
 * @name index.ts
 * @version 2026-01-13
 * @summary Event handlers
 **/
"use strict"

import type { DiscordEvent } from "../types"
import ClientReady from "./ClientReady"
import GuildCreate from "./GuildCreate"
import GuildMemberAdd from "./GuildMemberAdd"
import GuildMemberRemove from "./GuildMemberRemove"
import GuildMemberUpdate from "./GuildMemberUpdate"
import InteractionCreate from "./InteractionCreate"
import MessageCreate from "./MessageCreate"
import VoiceStateUpdate from "./VoiceStateUpdate"

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
