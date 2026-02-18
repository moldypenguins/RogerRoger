/**
 * @name events/VoiceStateUpdate.ts
 * @version 2026-02-04
 * @summary Handles voice state update events
 **/
"use strict"
import util from "node:util"

import type { Client, VoiceState } from "discord.js"
import { Events, userMention, channelMention } from "discord.js"
import type { DiscordEvent, DiscordGuildData } from "../types"
import Config from "../config"
import { DiscordGuild } from "../databank"

/** Voice state update event handler */
const ev: DiscordEvent = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(client: Client, oldState: VoiceState, newState: VoiceState) {
    if (!oldState.member) return
    if (oldState.member.user.bot) return
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: oldState.member.guild.id })
    if (!_guild) return

    let _message = null
    let _color = null

    if (oldState.channelId !== null && newState.channelId === null) {
      _message = `${oldState.member.user.tag} left\n- ${channelMention(oldState.channelId)}`
      _color = 0xff6961
    } else if (oldState.channelId === null && newState.channelId !== null) {
      _message = `${oldState.member.user.tag} joined\n- ${channelMention(newState.channelId)}`
      _color = 0x77dd77
    } else if (
      oldState.channelId !== null &&
      newState.channelId !== null &&
      newState.channelId !== oldState.channelId
    ) {
      _message = `${oldState.member.user.tag} moved\n- from ${channelMention(oldState.channelId)}\n- to ${channelMention(newState.channelId)}`
      _color = 0xffb347
    }

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }
    // Admin logging
    const _chan = client.channels.cache.get(_guild.logsChannelId)
    if (_chan?.isTextBased() && "send" in _chan && _message && _color) {
      _chan?.send({
        embeds: [
          {
            color: _color,
            description: _message,
            author: {
              name: "Voice State Update",
              icon_url: "https://media.discordapp.net/stickers/1469496572998848657.webp?size=32&quality=lossless"
            }
          }
        ]
      })
    }
  }
}

export default ev
