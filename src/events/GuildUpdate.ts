/**
 * @name events/GuildUpdate.ts
 * @version 2026-02-19
 * @summary Handles guild setting changes
 **/

import { Events, Guild, ContainerBuilder, MessageFlags } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Guild update event handler */
const ev: DiscordEvent = {
  name: Events.GuildUpdate,
  once: false,
  execute: async (client: DiscordBot, oldGuild: Guild, newGuild: Guild) => {
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: newGuild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Build list of changed properties
    const changes: string[] = []
    if (oldGuild.name !== newGuild.name) {
      changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`)
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push("**Icon:** Changed")
    }
    if (oldGuild.description !== newGuild.description) {
      changes.push(`**Description:** ${oldGuild.description || "*None*"} → ${newGuild.description || "*None*"}`)
    }
    if (oldGuild.ownerId !== newGuild.ownerId) {
      changes.push(`**Owner:** <@${oldGuild.ownerId}> → <@${newGuild.ownerId}>`)
    }

    // Only log if there are meaningful changes
    if (changes.length === 0) return

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      const changeLines = changes.map((change) => `- ${change}`).join("\n")
      const _container = new ContainerBuilder()
        .setAccentColor(0xffb347)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Guild Updated\n${changeLines}`))

      _logchan.send({
        components: [_container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    }
  }
}

export default ev
