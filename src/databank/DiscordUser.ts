/**
 * @name DiscordUser.ts
 * @version 2026-02-05
 * @summary Discord user schema
 **/
"use strict"

import { model, Schema } from "mongoose"
import { DiscordUserData } from "../types/index.js"

/** Mongoose schema for Discord user data */
const DiscordUserSchema = new Schema<DiscordUserData>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    discriminator: { type: String, required: true },
    globalName: { type: String, required: false, default: null },
    avatar: { type: String, required: false, default: null },
    bot: { type: Boolean, required: false, default: false },
    system: { type: Boolean, required: false, default: false },
    banner: { type: String, required: false, default: null },
    accentColor: { type: Number, required: false, default: null },
    flags: { type: Number, required: false },
    avatarDecorationData: { type: Schema.Types.Mixed, required: false, default: null },
    foxholeFaction: { type: String, required: false, default: null }
  },
  {
    timestamps: true
  }
)

export default model<DiscordUserData>("DiscordUser", DiscordUserSchema, "DiscordUsers")
