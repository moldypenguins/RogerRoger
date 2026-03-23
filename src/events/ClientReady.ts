/**
 * @name events/ClientReady.ts
 * @version 2026-02-04
 * @summary Handles the client ready event
 **/

import { Guild, GuildMember, ActivityType, Events } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData, DiscordUserData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild, DiscordUser } from "../databank/index.js"

/** Client ready event handler */
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
        let doc = await DiscordUser.findOneAndUpdate<DiscordUserData>({ id: value.user.id }, new DiscordUser(value.user), {
          upsert: true, // create if doesn't exist
          returnDocument: "after", // return updated document
          setDefaultsOnInsert: true // apply defaults on insert
        })
      })

      // Ensure log channel populated
      if (!_guilds[_g].logsChannelId || _guilds[_g].logsChannelId.length <= 0) {
        if (Config.debug) console.log("Invalid log channel.")
        continue
      }
      // Admin logging
      const _logchan = client.channels.cache.get(_guilds[_g].logsChannelId)
      if (_logchan?.isTextBased() && "send" in _logchan && Config.discord.connected.length > 0) {
        _logchan.send({
          embeds: [
            {
              color: _guilds[_g].embedColor,
              description: Config.discord.connected,
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
