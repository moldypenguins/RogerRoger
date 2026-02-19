/**
 * @name events/ClientReady.ts
 * @version 2026-02-04
 * @summary Handles the client ready event
 **/
"use strict"

import type { Guild, GuildMember } from "discord.js"
import { ActivityType, Events } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types"
import Config from "../config"
import { DiscordGuild, DiscordUser } from "../databank"

/**
 * Ready event handler - fires once when the bot is ready
 */
const ev: DiscordEvent = {
  name: Events.ClientReady,
  once: true,
  execute: async (client: DiscordBot) => {
    if (!client.user) return

    console.log(`Logged in as ${client.user.displayName}!`)
    client.user.setActivity(Config.discord.activity, { type: ActivityType.Custom })

    const _guilds: DiscordGuildData[] = await DiscordGuild.find()
    for (let _g = 0; _g < _guilds.length; _g++) {
      // Upsert guild member users
      let _guild: Guild | undefined = client.guilds.cache.get(_guilds[_g].id)
      if (!_guild) return
      _guild.members.cache.each(async (value: GuildMember) => {
        //DiscordUserData
        let doc = await DiscordUser.findOneAndUpdate({ id: value.user.id }, new DiscordUser(value.user), {
          upsert: true, // create if doesn't exist
          new: true, // return updated document
          setDefaultsOnInsert: true // apply defaults on insert
        })
        doc.save()
      })

      // Ensure log channel populated
      if (!_guilds[_g].logsChannelId || _guilds[_g].logsChannelId.length <= 0) {
        if (Config.debug) console.log("Invalid log channel.")
        continue
      }
      // Admin logging
      const _logchan = client.channels.cache.get(_guilds[_g].logsChannelId)
      if (_logchan?.isTextBased() && "send" in _logchan) {
        _logchan.send({
          embeds: [
            {
              color: 0x77dd77,
              description: Config.discord.activity,
              author: {
                name: `${client.user.displayName} Connected`,
                icon_url: "https://media.discordapp.net/stickers/1469552270105383065.webp?size=32&quality=lossless"
              }
            }
          ]
        })
      }
    }
  }
}

export default ev
