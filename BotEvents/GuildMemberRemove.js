"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(client, member) {
    let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });
    //admin logging
    client.channels.cache.get(_guild.guild_logs).send(`GuildMemberAdd: ${userMention(member.id)} joined the server.`);
  },
};
