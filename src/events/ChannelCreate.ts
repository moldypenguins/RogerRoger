/**
 * @name events/ChannelCreate.ts
 * @version 2026-02-19
 * @summary Handles channel creation events
 **/

import { ChannelType, Events, GuildChannel, ContainerBuilder, MessageFlags, GuildEmoji } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

/** Channel create event handler */
const ev: DiscordEvent = {
  name: Events.ChannelCreate,
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

      const _emoji = channel.guild.emojis.cache.find((e) => e.name === channelType.toLowerCase()) as GuildEmoji
      const _container = new ContainerBuilder().setAccentColor(_guild.embedColor)

      if (channel.type === ChannelType.GuildCategory) {
        _container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### ${_emoji.toString()} Category Created`))
      } else {
        _container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### ${_emoji.toString()} ${channelType} Channel Created`))
      }
      _container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`- ${channel.name} <${channel.id}>`))

      await _logchan.send({
        components: [_container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    }
  }
}

export default ev
