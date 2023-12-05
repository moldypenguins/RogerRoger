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
      guild_logs: guild.systemChannel.id,
      guild_welcome: guild.systemChannel.id,
      guild_stockpiles: guild.systemChannel.id,
      guild_message: "Welcome {{user}}.",
      guild_colour: 0xdbd3b0
    }).save();

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0x77DD77,
        description: `Joined guild ${guild.name} (${guild.id}).`,
        author: {
          name: 'Guild Create',
          icon_url: 'https://i.imgur.com/LykmYQV.png'
        },
      }
    ]});

  },
};
