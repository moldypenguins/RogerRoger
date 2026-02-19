/**
 * @name events/MessageDelete.ts
 * @version 2026-02-19
 * @summary Handles message deletion events
 **/
"use strict"

import { Events, Message } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Message delete event handler */
const ev: DiscordEvent = {
  name: Events.MessageDelete,
  once: false,
  execute: async (client: DiscordBot, message: Message) => {
    if (!message.guild) return

    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: message.guild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      const content = message.content || "*[Content not cached]*"
      const author = message.author ? `${message.author.tag} (${message.author.id})` : "*[Author unknown]*"
      const channel = message.channel ? `<#${message.channel.id}>` : "*[Channel unknown]*"

      _logchan.send({
        embeds: [
          {
            color: 0xff6961,
            description: `**Message deleted in ${channel}**\n**Author:** ${author}\n**Content:** ${content}`,
            author: {
              name: "Message Delete",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
