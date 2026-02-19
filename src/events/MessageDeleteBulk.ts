/**
 * @name events/MessageDeleteBulk.ts
 * @version 2026-02-19
 * @summary Handles bulk message deletion events
 **/
"use strict"

import { Collection, Events, Message, Snowflake } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Bulk message delete event handler */
const ev: DiscordEvent = {
  name: Events.MessageBulkDelete,
  once: false,
  execute: async (client: DiscordBot, messages: Collection<Snowflake, Message>) => {
    const firstMessage = messages.first()
    if (!firstMessage?.guild) return

    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: firstMessage.guild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      const channel = firstMessage.channel ? `<#${firstMessage.channel.id}>` : "*[Channel unknown]*"

      _logchan.send({
        embeds: [
          {
            color: 0xff6961,
            description: `**${messages.size} messages bulk deleted in ${channel}**`,
            author: {
              name: "Message Bulk Delete",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
