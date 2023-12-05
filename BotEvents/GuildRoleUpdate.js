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
 * @name GuildRoleUpdate.js
 * @version 2023-12-05
 * @summary bot events
 **/

import util from "util";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildRoleUpdate,
  once: false,
  async execute(client, oldRole, newRole) {
    //console.log(`OLD: ${util.inspect(oldRole, true, 1, true)}`);
    //console.log(`NEW: ${util.inspect(newRole, true, 1, true)}`);
    let _guild = await Guild.findOne({ guild_id: oldRole.guild.id });

    let _reply = [];
    if(oldRole.name != newRole.name) {
      _reply.push(`Name: **${oldRole.name}** was changed to **${newRole.name}**`);
    }
    if(oldRole.color != newRole.color) {
      _reply.push(`Color: **${oldRole.color}** was changed to **${newRole.color}**`);
    }
    //admin logging
    client.channels.cache.get(_guild.guild_logs).send({embeds: [
      {
        color: 0xFFB347,
        description: _reply.join("\n"),
        author: {
          name: `Guild Role Update`,
          icon_url: 'https://i.imgur.com/SrvV95U.png'
        },
        fields: [
          
        ]
      }
    ]});
  },
};
