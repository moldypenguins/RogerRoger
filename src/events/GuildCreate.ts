/**
 * @name GuildCreate.ts
 * @version 2026-02-05
 * @summary GuildCreate event hadler
 **/

//import util from "node:util"
import { Events, Guild } from "discord.js"
import type { DiscordBot, DiscordEvent, DiscordGuildData } from "../types/index.js"
import Config from "../config/index.js"
import { DiscordGuild } from "../databank/index.js"

const ev: DiscordEvent = {
  name: Events.GuildCreate,
  once: false,
  async execute(client: DiscordBot, guild: Guild) {
    if (Config.debug) console.log(`Discord: Joined guild ${guild.name} (${guild.id})!`)

    //DiscordGuildData
    let doc = await DiscordGuild.findOneAndUpdate({ id: guild.id }, new DiscordGuild(guild), {
      upsert: true, // create if doesn't exist
      new: true, // return updated document
      setDefaultsOnInsert: true // apply defaults on insert
    })
    doc.save()
  }
}

export default ev
