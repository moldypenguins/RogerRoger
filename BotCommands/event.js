"use strict";
/**
 * event
 * Copyright (c) 2023 Craig Roberts
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
 * @name event.js
 * @version 2023/11/28
 * @summary RogerRoger command
 **/

import util from "util";
import Config from "../config.js";
import { DB, Guild, Stockpile } from "../db.js";
import { ActionRowBuilder, PermissionFlagsBits, ButtonStyle, ChannelType, time, EmbedBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, roleMention, channelMention, userMention, ButtonBuilder, InteractionResponse, Integration } from "discord.js";

import { encode } from "html-entities";
import numeral from "numeral";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);


export default {
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Create a new event.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option
        .setName("title")
        .setDescription("The event title.")
        .setRequired(true)
        .setMaxLength(255))
    .addStringOption(option => 
      option
        .setName("description")
        .setDescription("The event description.")
        .setRequired(true)
        .setMaxLength(2000))
    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('The color to set.')
        .setRequired(false)
        .setMinLength(6)
        .setMaxLength(6)
      ),
   
  async execute(client, interaction) {
    //console.log(`INT: ${util.inspect(interaction, true, 2, true)}`);
    let _guild = await Guild.findOne({ guild_id: interaction.guildId });

    if (interaction.isChatInputCommand()) {
      let _title = interaction.options.getString("title");
      let _description = interaction.options.getString("description");
      let _color = interaction.options.getString("color");
      if(_color) { _color = parseInt(_color, 16); } else { _color = _guild.guild_color; }

      const role = new RoleSelectMenuBuilder()
        .setCustomId("event_role")
        .setPlaceholder('Role')
        .setMinValues(1)
        .setMaxValues(1);

      const post = new ButtonBuilder()
        .setCustomId("event_post")
        .setLabel("Post")
        .setStyle(ButtonStyle.Primary);

      const cancel = new ButtonBuilder()
        .setCustomId("event_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger);

      interaction.reply({ 
        embeds: [{
          color: _color,
          title: _title,
          description: _description.replace(/\\n/g, "\n"),
          fields: []
        }],
        components: [
          new ActionRowBuilder().addComponents(role),
          new ActionRowBuilder().addComponents(post, cancel)
        ],
        ephemeral: false 
      });

    }


  }
};
