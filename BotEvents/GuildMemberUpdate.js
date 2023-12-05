"use strict";

import util from "util";
import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(client, oldMember, newMember) {
    let _guild = await Guild.findOne({ guild_id: oldMember.guild.id });
    let _action = "";
    let _reply = [];
    if(oldMember.nickname != newMember.nickname) {
      _action = "Nickname Changed";
      _reply.push(`**${oldMember.nickname}** was changed to **${newMember.nickname}**`);
    }
    if(oldMember.roles.cache.size !== newMember.roles.cache.size) {
      if(oldMember.roles.cache.size < newMember.roles.cache.size) {
        //role added
        _action = "Role Added";
        let _role = newMember.roles.cache.find(r => !oldMember.roles.cache.has(r.id));
        _reply.push(`${roleMention(_role.id)} was added to ${userMention(newMember.id)}`);
      } else {
        //role removed
        _action = "Role Removed";
        let _role = oldMember.roles.cache.find(r => !newMember.roles.cache.has(r.id));
        _reply.push(`${roleMention(_role.id)} was removed from ${userMention(newMember.id)}`);
      }
    }

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0x77DD77,
        description: _reply.join("\n"),
        author: {
          name: `Guild Member Update (${_action})`,
          icon_url: 'https://i.imgur.com/SrvV95U.png'
        },
      }
    ]});
  }
};
