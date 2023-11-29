"use strict";
/**
 * stockpiles
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
 * @name setup.js
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
    .setName("setup")
    .setDescription("Configure bot.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName("logs")
        .setDescription("Set the logs channel.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to post to.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
          ))
    .addSubcommand(subcommand =>
      subcommand
        .setName("stockpiles")
        .setDescription("Set the stockpiles channel.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to post to.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
          ))
    .addSubcommand(subcommand =>
      subcommand
        .setName("welcome")
        .setDescription("Set the welcome channel.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to post to.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
          ))
    .addSubcommand(subcommand =>
      subcommand
        .setName("message")
        .setDescription("Set the welcome message.")
        .addStringOption(option =>
          option.setName('message')
            .setDescription('The message to set.')
            .setRequired(true)
            .setMaxLength(2000) //ensure the text will fit in an embed description
          )
        .addStringOption(option =>
          option.setName('color')
            .setDescription('The color to set.')
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)
          ))
    .addSubcommand(subcommand =>
      subcommand
        .setName("faction")
        .setDescription("Set the guild faction.")
        .addStringOption(option =>
          option.setName('faction')
            .setDescription('The faction to set.')
            .setRequired(true)
            .addChoices(
              { name: 'Colonial', value: 'Colonial' },
              { name: 'Warden', value: 'Warden' }
            )
          )),
   
  async execute(client, interaction) {
    //console.log(`INT: ${util.inspect(interaction, true, 2, true)}`);
    let _guild = await Guild.findOne({ guild_id: interaction.guildId });

    if (interaction.isChatInputCommand()) {
      let _subcommand = interaction.options._subcommand;

      if(_subcommand == "logs") {
        let _channel = interaction.options.getChannel("channel").id;
        await Guild.updateOne({ guild_id: interaction.guildId }, { $set: { guild_logs: _channel } });
        interaction.reply({ content: `Set ${channelMention(_channel)} as the logs channel.`, ephemeral: true });

      } else if(_subcommand == "stockpiles") {
        let _channel = interaction.options.getChannel("channel").id;
        await Guild.updateOne({ guild_id: interaction.guildId }, { $set: { guild_stockpiles: _channel } });
        interaction.reply({ content: `Set ${channelMention(_channel)} as the stockpiles channel.`, ephemeral: true });

      } else if(_subcommand == "welcome") {
        let _channel = interaction.options.getChannel("channel").id;
        await Guild.updateOne({ guild_id: interaction.guildId }, { $set: { guild_welcome: _channel } });
        interaction.reply({ content: `Set ${channelMention(_channel)} as the welcome channel.`, ephemeral: true });

      } else if(_subcommand == "message") {
        let _message = interaction.options.getString("message");
        let _color = interaction.options.getString("color");
        await Guild.updateOne({ guild_id: interaction.guildId }, { $set: { guild_message: _message, guild_color: parseInt(_color, 16) } });
        interaction.reply({ content: `Set guild welcome message.`, ephemeral: true });

      } else if(_subcommand == "faction") {
        let _faction = interaction.options.getString("faction");
        await Guild.updateOne({ guild_id: interaction.guildId }, { $set: { guild_faction: _faction } });
        interaction.reply({ content: `Set guild faction.`, ephemeral: true });

      } 
      
    }


  }
};

