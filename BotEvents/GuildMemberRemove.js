"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(client, member) {
    //admin logging
    client.channels.cache.get(Config.discord.channel_id).send(`GuildMemberAdd: ${userMention(member.id)} joined the server.`);
  },
};
