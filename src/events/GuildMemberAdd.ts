/**
 * @name events/GuildMemberAdd.ts
 * @version 2026-02-04
 * @summary Handles guild member add events
 **/

import { Events, GuildMember, userMention, ContainerBuilder, MessageFlags } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Guild member add event handler */
const ev: DiscordEvent = {
  name: Events.GuildMemberAdd,
  once: false,
  execute: async (client: DiscordBot, member: GuildMember) => {
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: member.guild.id })
    if (!_guild) return

    if (!member.user.bot && _guild.welcomeMessage) {
      const _wchan = client.channels.cache.get(_guild.systemChannelId ?? "")
      if (_wchan?.isTextBased() && "send" in _wchan) {
        const welcomeMessage = _guild.welcomeMessage
          .replace(/\\n/g, "\n")
          .replace(/{{user}}/i, `${userMention(member.user.id)}`)
          .replace(/{{guild}}/i, `${member.guild.name}`)

        const _container = new ContainerBuilder()
          .setAccentColor(_guild.embedColor)
          .addTextDisplayComponents((textDisplay) => textDisplay.setContent(welcomeMessage))

        _wchan.send({
          components: [_container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
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
      const _container = new ContainerBuilder()
        .setAccentColor(0x77dd77)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Member Joined\n- ${member.user.tag}`))

      _logchan.send({
        components: [_container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    }
  }
}

export default ev
