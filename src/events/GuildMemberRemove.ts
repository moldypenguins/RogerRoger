/**
 * @name events/GuildMemberRemove.ts
 * @version 2026-02-04
 * @summary Handles guild member remove events
 **/
"use strict"

import { Client, Events, GuildMember } from "discord.js"
import type { DiscordEvent, DiscordGuildData } from "../types"
import Config from "../config"
import { DiscordGuild } from "../databank"

/** Guild member remove event handler */
const ev: DiscordEvent = {
  name: Events.GuildMemberRemove,
  once: false,
  execute: async (client: Client, member: GuildMember) => {
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: member.guild.id })
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
            description: `${member.user.tag} left the server.`,
            author: {
              name: "Guild Member Remove",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
