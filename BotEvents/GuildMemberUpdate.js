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

    let _reply = [];
    if(oldMember.nickname != newMember.nickname) {
      //name changed
      _reply.push(`Nickname: **${oldMember.nickname}** was changed to **${newMember.nickname}**`);
    }
    if(oldMember.roles.cache.size < newMember.roles.cache.size) {
      //role added
      let _role = newMember.roles.cache.find(r => !oldMember.roles.cache.has(r.id));
      _reply.push(`Role: ${roleMention(_role.id)} was added to ${userMention(newMember.id)}`);
    } 
    if(oldMember.roles.cache.size > newMember.roles.cache.size) {
      //role removed
      let _role = oldMember.roles.cache.find(r => !newMember.roles.cache.has(r.id));
      _reply.push(`Role: ${roleMention(_role.id)} was removed from ${userMention(newMember.id)}`);
    }
    

    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0xFFB347,
        description: _reply.join("\n"),
        author: {
          name: `Guild Member Update`,
          icon_url: 'https://i.imgur.com/AkJobK1.png'
        },
      }
    ]});
  }
};
