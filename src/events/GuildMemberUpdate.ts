/**
 * @name events/GuildMemberUpdate.ts
 * @version 2026-02-04
 * @summary Handles guild member update events
 **/

import { Events, GuildMember, roleMention, ContainerBuilder, MessageFlags } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Guild member update event handler */
const ev: DiscordEvent = {
  name: Events.GuildMemberUpdate,
  once: false,
  execute: async (client: DiscordBot, oldMember: GuildMember, newMember: GuildMember) => {
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: oldMember.guild.id })
    if (!_guild) return

    let _reply = []
    if (oldMember.nickname != newMember.nickname) {
      //name changed
      _reply.push(`Nickname: **${oldMember.nickname}** was changed to **${newMember.nickname}**`)
    }
    if (oldMember.roles.cache.size < newMember.roles.cache.size) {
      //role added
      let _role = newMember.roles.cache.find((r) => !oldMember.roles.cache.has(r.id))
      if (_role) {
        _reply.push(`Role: ${roleMention(_role.id)} was added to ${newMember.user.tag}`)
      }
    }
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
      //role removed
      let _role = oldMember.roles.cache.find((r) => !newMember.roles.cache.has(r.id))
      if (_role) {
        _reply.push(`Role: ${roleMention(_role.id)} was removed from ${newMember.user.tag}`)
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
      const replyLines = _reply.length > 0 ? _reply.map((line) => `- ${line}`).join("\n") : "- *No changes detected*"
      const _container = new ContainerBuilder()
        .setAccentColor(0x77dd77)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Member Updated\n${replyLines}`))

      _logchan.send({
        components: [_container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    }
  }
}

export default ev
