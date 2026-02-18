/**
 * @name types/index.d.ts
 * @version 2026-01-13
 * @summary Type definitions
 **/

import type { Guild, User } from "discord.js"

/** Interfaces for databank models */
export interface DiscordGuildData extends Guild {
  _id: Schema.Types.ObjectId
  foxholeFaction: string
  stockpilesChannelId: string
  logsChannelId: string
  welcomeMessage: string
  embedColor: number
  createdAt: Date
  updatedAt: Date
}

export interface DiscordUserData extends User {
  _id: Schema.Types.ObjectId
  foxholeFaction: string
  createdAt: Date
  updatedAt: Date
}

export interface FoxholeTownData {
  _id: Schema.Types.ObjectId
  hex: string
  name: string
  building: string
  createdAt: Date
  updatedAt: Date
}

export interface FoxholeStockpileData {
  _id: Schema.Types.ObjectId
  guild: Schema.Types.ObjectId
  town: Schema.Types.ObjectId
  code: string
  messageId: string
  updatedBy: Schema.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

/** Interface for Discord command handlers */
export interface DiscordCommand {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
  execute: (client: Client, ...args) => void | Promise<void>
}

/** Interface for Discord event handlers */
export interface DiscordEvent {
  name: string
  once?: boolean
  execute: (client: Client, ...args) => void | Promise<void>
}

/** Interface for configuration */
export type Config = {
  /** Logging */
  debug: boolean
  /** Database */
  database: string
  /** Discord */
  discord: {
    token: string
    client_id: string
    activity: string
  }
  /** Steam */
  steam: {
    api_key: string
  }
}
