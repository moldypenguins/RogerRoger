"use strict";

import util from "util";
import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(client, member) {
    let _guild = await Guild.findOne({ guild_id: member.guild.id });
    
    if(!member.user.bot) {
      client.channels.cache.get(_guild.guild_welcome).send({
        embeds: [{
          color: _guild.guild_colour,
          description: `${_guild.guild_message.replace(/\\n/g, "\n").replace(/{{user}}/i, `${userMention(member.id)}`)}`,
        }], 
        ephemeral: false
      });
    }

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0x77DD77,
        description: `${userMention(member.id)} joined the server.`,
        author: {
          name: 'Guild Member Add',
          icon_url: 'https://i.imgur.com/SvSOrZ8.png'
        },
      }
    ]});
  },
};
