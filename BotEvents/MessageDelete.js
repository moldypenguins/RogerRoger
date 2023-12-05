"use strict";
/**
 * RogerRoger
 * Copyright (c) 2023 The Old Republic - Craig Roberts
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/gpl-3.0.html
 *
 * @name MessageDelete.js
 * @version 2023-12-05
 * @summary bot events
 **/

import util from "util";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.MessageDelete,
  once: false,
  async execute(client, message) {
    //console.log(`DELETE: ${util.inspect(message, true, 1, true)}`);
    if(!message.author.bot && message.author.id != Config.discord.client_id) {
      let _guild = await Guild.findOne({ guild_id: message.guildId });

      //admin logging
      client.channels.cache.get(_guild.guild_logs).send({embeds: [
        {
          color: 0xFF6961,
          description: `A message from **${userMention(message.author.id)}** was deleted in ${channelMention(message.channelId)}.`,
          author: {
            name: 'Message Deleted',
            icon_url: 'https://i.imgur.com/kS0D3Nc.png'
          },
        }
      ]});
    }
  }
};
