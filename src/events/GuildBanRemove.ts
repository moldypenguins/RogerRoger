/**
 * @name events/GuildBanRemove.ts
 * @version 2026-02-19
 * @summary Handles user unban events
 **/

import { Events, GuildBan } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Guild ban remove event handler */
const ev: DiscordEvent = {
  name: Events.GuildBanRemove,
  once: false,
  execute: async (client: DiscordBot, ban: GuildBan) => {
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: ban.guild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      _logchan.send({
        embeds: [
          {
            color: 0x77dd77,
            description: `**User unbanned**\n**User:** ${ban.user.tag} (${ban.user.id})`,
            author: {
              name: "Guild Ban Remove",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
