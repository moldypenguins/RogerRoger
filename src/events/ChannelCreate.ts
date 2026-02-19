/**
 * @name events/ChannelCreate.ts
 * @version 2026-02-19
 * @summary Handles channel creation events
 **/

import { ChannelType, Events, GuildChannel } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Channel create event handler */
const ev: DiscordEvent = {
  name: Events.ChannelCreate,
  once: false,
  execute: async (client: DiscordBot, channel: GuildChannel) => {
    if (!channel.guild) return

    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: channel.guild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      let channelType = "Unknown"
      switch (channel.type) {
        case ChannelType.GuildText:
          channelType = "Text"
          break
        case ChannelType.GuildVoice:
          channelType = "Voice"
          break
        case ChannelType.GuildCategory:
          channelType = "Category"
          break
      }

      _logchan.send({
        embeds: [
          {
            color: 0x77dd77,
            description: `**Channel created**\n**Type:** ${channelType}\n**Channel:** <#${channel.id}>`,
            author: {
              name: "Channel Create",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
