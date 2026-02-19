/**
 * @name events/ChannelUpdate.ts
 * @version 2026-02-19
 * @summary Handles channel update events
 **/
"use strict"

import { Events, GuildChannel } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Channel update event handler */
const ev: DiscordEvent = {
  name: Events.ChannelUpdate,
  once: false,
  execute: async (client: DiscordBot, oldChannel: GuildChannel, newChannel: GuildChannel) => {
    if (!newChannel.guild) return

    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: newChannel.guild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Build list of changed properties
    const changes: string[] = []
    if (oldChannel.name !== newChannel.name) {
      changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`)
    }
    if ("topic" in oldChannel && "topic" in newChannel && oldChannel.topic !== newChannel.topic) {
      changes.push(`**Topic:** ${oldChannel.topic || "*None*"} → ${newChannel.topic || "*None*"}`)
    }
    if ("nsfw" in oldChannel && "nsfw" in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`)
    }

    // Only log if there are meaningful changes
    if (changes.length === 0) return

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      _logchan.send({
        embeds: [
          {
            color: 0xffb347,
            description: `**Channel updated**\n**Channel:** <#${newChannel.id}>\n${changes.join("\n")}`,
            author: {
              name: "Channel Update",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
