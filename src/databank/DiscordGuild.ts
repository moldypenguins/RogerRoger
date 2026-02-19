/**
 * @name DiscordGuild.ts
 * @version 2026-02-05
 * @summary Discord guild schema
 **/
"use strict"

import { model, Schema } from "mongoose"
import { DiscordGuildData } from "../types/index.js"

/** Mongoose schema for Discord guild data */
const DiscordGuildSchema = new Schema<DiscordGuildData>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: { type: String, required: false, default: null },
    splash: { type: String, required: false, default: null },
    discoverySplash: { type: String, required: false, default: null },
    ownerId: { type: String, required: true },
    afkChannelId: { type: String, required: false, default: null },
    afkTimeout: { type: Number, required: true },
    widgetEnabled: { type: Boolean, required: false },
    widgetChannelId: { type: String, required: false, default: null },
    systemChannelId: { type: String, required: false, default: null },
    systemChannelFlags: { type: Number, required: true },
    rulesChannelId: { type: String, required: false, default: null },
    description: { type: String, required: false, default: null },
    banner: { type: String, required: false, default: null },
    preferredLocale: { type: String, required: true },
    publicUpdatesChannelId: { type: String, required: false, default: null },
    approximateMemberCount: { type: Number, required: false },
    approximatePresenceCount: { type: Number, required: false },
    safetyAlertsChannelId: { type: String, required: false, default: null },
    foxholeFaction: { type: String, required: false, default: null },
    stockpilesChannelId: { type: String, required: false, default: null },
    logsChannelId: { type: String, required: false, default: null },
    welcomeMessage: { type: String, required: false, default: null },
    embedColor: { type: Number, required: false, default: null }
  },
  {
    timestamps: true
  }
)

export default model<DiscordGuildData>("DiscordGuild", DiscordGuildSchema, "DiscordGuilds")
