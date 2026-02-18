/**
 * @name events/GuildMemberAdd.ts
 * @version 2026-02-04
 * @summary Handles guild member add events
 **/
"use strict"

import { Client, Events, GuildMember, userMention } from "discord.js"
import type { DiscordEvent, DiscordGuildData } from "../types"
import Config from "../config"
import { DiscordGuild } from "../databank"

/** Guild member add event handler */
const ev: DiscordEvent = {
  name: Events.GuildMemberAdd,
  once: false,
  execute: async (client: Client, member: GuildMember) => {
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: member.guild.id })
    if (!_guild) return

    if (!member.user.bot && _guild.welcomeMessage) {
      const _wchan = client.channels.cache.get(_guild.systemChannelId ?? "")
      if (_wchan?.isTextBased() && "send" in _wchan) {
        _wchan.send({
          embeds: [
            {
              color: _guild.embedColor,
              description: _guild.welcomeMessage
                .replace(/\\n/g, "\n")
                .replace(/{{user}}/i, `${userMention(member.user.id)}`)
                .replace(/{{guild}}/i, `${member.guild.name}`)
            }
          ]
        })
      }
    }

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
            description: `${member.user.tag} joined the server.`,
            author: {
              name: "Guild Member Add",
              icon_url: "https://media.discordapp.net/stickers/1469518684040200305.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
