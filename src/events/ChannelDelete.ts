/**
 * @name events/ChannelDelete.ts
 * @version 2026-02-19
 * @summary Handles channel deletion events
 **/

import { ChannelType, Events, GuildChannel, ContainerBuilder, MessageFlags } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Channel delete event handler */
const ev: DiscordEvent = {
  name: Events.ChannelDelete,
  once: false,
  execute: async (client: DiscordBot, channel: GuildChannel) => {
    if (!channel.guild) return

    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: channel.guild.id })
    if (!_guild) return

    // Ensure log channel populated
    if (!_guild.logsChannelId || _guild.logsChannelId.length <= 0) {
      if (Config.debug) console.log("Invalid log channel.")
      return
    }

    // Admin logging
    const _logchan = client.channels.cache.get(_guild.logsChannelId)
    if (_logchan?.isTextBased() && "send" in _logchan) {
      let channelType = "Unknown"
      switch (channel.type) {
        case ChannelType.GuildText:
          channelType = "Text"
          break
        case ChannelType.GuildVoice:
          channelType = "Voice"
          break
        case ChannelType.GuildCategory:
          channelType = "Category"
          break
      }

      const _container = new ContainerBuilder()
        .setAccentColor(0xff6961)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(`### Channel Deleted\n- **Name:** ${channel.name}\n- **Type:** ${channelType}\n- **ID:** ${channel.id}`)
        )

      _logchan.send({
        components: [_container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    }
  }
}

export default ev
