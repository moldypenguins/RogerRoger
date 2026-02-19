/**
 * @name index.ts
 * @version 2026-02-19
 * @summary Event handlers
 **/

import type { DiscordEvent } from "../types/index.js"
import ChannelCreate from "./ChannelCreate.js"
import ChannelDelete from "./ChannelDelete.js"
import ChannelUpdate from "./ChannelUpdate.js"
import ClientReady from "./ClientReady.js"
import GuildBanAdd from "./GuildBanAdd.js"
import GuildBanRemove from "./GuildBanRemove.js"
import GuildCreate from "./GuildCreate.js"
import GuildDelete from "./GuildDelete.js"
import GuildMemberAdd from "./GuildMemberAdd.js"
import GuildMemberRemove from "./GuildMemberRemove.js"
import GuildMemberUpdate from "./GuildMemberUpdate.js"
import GuildUpdate from "./GuildUpdate.js"
import InteractionCreate from "./InteractionCreate.js"
import MessageCreate from "./MessageCreate.js"
import MessageDelete from "./MessageDelete.js"
import MessageDeleteBulk from "./MessageDeleteBulk.js"
import MessageUpdate from "./MessageUpdate.js"
import VoiceStateUpdate from "./VoiceStateUpdate.js"

/**
 * Strongly typed collection of Discord event handlers
 */
const DiscordEvents: Record<string, DiscordEvent> = {
  ChannelCreate,
  ChannelDelete,
  ChannelUpdate,
  ClientReady,
  GuildBanAdd,
  GuildBanRemove,
  GuildCreate,
  GuildDelete,
  GuildMemberAdd,
  GuildMemberRemove,
  GuildMemberUpdate,
  GuildUpdate,
  InteractionCreate,
  MessageCreate,
  MessageDelete,
  MessageDeleteBulk,
  MessageUpdate,
  VoiceStateUpdate
} as const

export default DiscordEvents
