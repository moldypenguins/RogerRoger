/**
 * @name events/MessageDeleteBulk.ts
 * @version 2026-02-19
 * @summary Handles bulk message deletion events
 **/

import { Collection, Events, Message, Snowflake, ContainerBuilder, MessageFlags } from "discord.js"
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

      const _container = new ContainerBuilder()
        .setAccentColor(0xff6961)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`### Bulk Messages Deleted\n- **Count:** ${messages.size}\n- **Channel:** ${channel}`)
        )

      _logchan.send({
        components: [_container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    }
  }
}

export default ev
