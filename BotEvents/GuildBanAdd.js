"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildBanAdd,
  once: false,
  async execute(client, ban) {
    console.log(`BAN: ${util.inspect(ban, true, 1, true)}`);
    let _guild = await Guild.findOne({ guild_id: ban.guild.id });

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0x77DD77,
        description: `**${ban.member.nickname}** was banned.`,
        author: {
          name: 'Guild Ban Add',
          icon_url: 'https://i.imgur.com/QOMqxcf.png'
        },
      }
    ]});
  },
};
