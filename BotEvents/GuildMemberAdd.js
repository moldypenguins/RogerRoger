"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(client, member) {
    let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });
    
    client.channels.cache.get(_guild.guild_welcome).send({ 
      embeds: [{
        color: 0xdbd3b0, //c1bba3 + f4ebbc
        description: `${_guild.guild_message.replace(/\\n/g, "\n").replace(/{{user}}/i, `${userMention(member.id)}`)}`,

      }], 
      ephemeral: false 
    });

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send(`GuildMemberAdd: ${userMention(member.id)} joined the server.`);
  },
};
