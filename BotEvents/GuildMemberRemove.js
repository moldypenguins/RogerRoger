"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(client, member) {
    let _guild = await Guild.findOne({ guild_id: member.guild.id });

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0xFF6961,
        description: `${userMention(member.id)} left the server.`,
        author: {
          name: 'Guild Member Remove',
          icon_url: 'https://i.imgur.com/QOMqxcf.png'
        },
      }
    ]});
  },
};
