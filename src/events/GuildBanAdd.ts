/**
 * @name events/GuildBanAdd.ts
 * @version 2026-02-19
 * @summary Handles user ban events
 **/

import { Events, GuildBan, ContainerBuilder, MessageFlags } from "discord.js"
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

      const _container = new ContainerBuilder()
        .setAccentColor(0xff6961)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`### User Banned\n- **User:** ${ban.user.tag} (${ban.user.id})\n- **Reason:** ${reason}`)
        )

      _logchan.send({
        components: [_container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    }
  }
}

export default ev
