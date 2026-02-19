/**
 * @name events/MessageUpdate.ts
 * @version 2026-02-19
 * @summary Handles message edit events
 **/
"use strict"

import { Events, Message } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Message update event handler */
const ev: DiscordEvent = {
  name: Events.MessageUpdate,
  once: false,
  execute: async (client: DiscordBot, oldMessage: Message, newMessage: Message) => {
    if (!newMessage.guild) return
    if (newMessage.author?.bot) return

    // Skip if content didn't change
    if (oldMessage.content === newMessage.content) return

    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: newMessage.guild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      const oldContent = oldMessage.content || "*[Content not cached]*"
      const newContent = newMessage.content || "*[Content not cached]*"
      const author = newMessage.author ? `${newMessage.author.tag} (${newMessage.author.id})` : "*[Author unknown]*"
      const channel = newMessage.channel ? `<#${newMessage.channel.id}>` : "*[Channel unknown]*"

      _logchan.send({
        embeds: [
          {
            color: 0xffb347,
            description: `**Message edited in ${channel}**\n**Author:** ${author}\n**Before:** ${oldContent}\n**After:** ${newContent}`,
            author: {
              name: "Message Update",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
