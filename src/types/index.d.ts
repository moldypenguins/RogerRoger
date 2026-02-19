/**
 * @name types/index.d.ts
 * @version 2026-02-18
 * @summary Type definitions
 **/

import type {
  Client,
  Guild,
  User,
  Interaction,
  Events,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from "discord.js"
import type { Schema } from "mongoose"

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

/** Extended Discord Client with custom bot functionality */
export class DiscordBot extends Client {
  public constructor()

  public register(): Promise<void>
  public start(): Promise<void>
  public shutdown(): Promise<void>
}

/** Interface for Discord command handlers */
export interface DiscordCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder
  execute: (client: DiscordBot, interaction: Interaction) => void | Promise<void>
}

/** Interface for Discord event handlers */
export interface DiscordEvent {
  name: Events
  once?: boolean
  execute: (client: DiscordBot, ...args) => void | Promise<void>
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
