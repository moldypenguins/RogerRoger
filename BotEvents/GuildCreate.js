"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildCreate,
  once: false,
  async execute(client, guild) {
    console.log(`Discord: Joined guild ${guild.name} (${guild.id})!`);

    let _guild = await new Guild({
      _id: new DB.Types.ObjectId(),
      guild_id: guild.id,
      guild_ownerId: guild.ownerId,
      guild_name: guild.name,
      guild_description: guild.description,
      guild_logs: client.guilds.cache.first().systemChannel,
      guild_welcome: client.guilds.cache.first().systemChannel,
      guild_stockpiles: client.guilds.cache.first().systemChannel,
      guild_message: "Welcome."
    }).save();
    
    //admin logging
    client.channels.cache.get(_guild.guild_logs).send(`GuildCreate: joined guild ${guild.name} (${guild.id}).`);
  },
};
