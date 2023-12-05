"use strict";

import util from "util";
import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(client, oldMember, newMember) {
    //console.log(`OLD: ${util.inspect(, true, 1, true)}`);
    //console.log(`NEW: ${util.inspect(newMember.roles.cache, true, 1, true)}`);

    let _guild = await Guild.findOne({ guild_id: oldMember.guild.id });

    let _reply = [];
    if(oldMember.nickname != newMember.nickname) {
      _reply.push(`**${oldMember.nickname}** was changed to **${newMember.nickname}**`);
    }
    if(oldMember.roles.cache.size !== newMember.roles.cache.size) {
      if(oldMember.roles.cache.size < newMember.roles.cache.size) {
        //role added
        let _role = newMember.roles.cache.find(r => !oldMember.roles.cache.has(r.id));
        _reply.push(`**${_role.name}** was added to **${newMember.nickname}**`);
      } else {
        //role removed
        let _role = oldMember.roles.cache.find(r => !newMember.roles.cache.has(r.id));
        _reply.push(`**${_role.name}** was removed from **${newMember.nickname}**`);
      }
    }

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0x77DD77,
        description: _reply.join("\n"),
        author: {
          name: 'Guild Member Update',
          icon_url: 'https://i.imgur.com/SrvV95U.png'
        },
      }
    ]});
  }
};
