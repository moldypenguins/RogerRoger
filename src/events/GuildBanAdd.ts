/**
 * @name events/GuildBanAdd.ts
 * @version 2026-02-19
 * @summary Handles user ban events
 **/

import { Events, GuildBan } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Guild ban add event handler */
const ev: DiscordEvent = {
  name: Events.GuildBanAdd,
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
      const reason = ban.reason || "*No reason provided*"

      _logchan.send({
        embeds: [
          {
            color: 0xff6961,
            description: `**User banned**\n**User:** ${ban.user.tag} (${ban.user.id})\n**Reason:** ${reason}`,
            author: {
              name: "Guild Ban Add",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
