/**
 * @name events/GuildDelete.ts
 * @version 2026-02-19
 * @summary Handles bot removal from guild events
 **/

import { Events, Guild } from "discord.js"
import type { DiscordBot, DiscordEvent } from "../types/index.js"
import Config from "../config/index.js"

/** Guild delete event handler */
const ev: DiscordEvent = {
  name: Events.GuildDelete,
  once: false,
  execute: async (client: DiscordBot, guild: Guild) => {
    if (Config.debug) console.log(`Discord: Left guild ${guild.name} (${guild.id})`)
  }
}

export default ev
