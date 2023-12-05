"use strict";

import util from "util";
import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(client, oldMember, newMember) {
    console.log(`OLD: ${util.inspect(oldMember, true, 1, true)}`);
    console.log(`NEW: ${util.inspect(newMember, true, 1, true)}`);

    let _guild = await Guild.findOne({ guild_id: oldMember.guild.id });

    let _reply = "";
    if(oldMember.name != newMember.name) {
      _reply = `**${oldMember.name}** was changed to **${newMember.name}**`;
    }

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0x77DD77,
        description: _reply,
        author: {
          name: 'Guild Member Update',
          icon_url: 'https://i.imgur.com/SrvV95U.png'
        },
      }
    ]});
  },
};
