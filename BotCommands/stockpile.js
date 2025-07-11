"use strict";
/**
 * stockpile
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
 * @name stockpile.js
 * @version 2023/11/28
 * @summary RogerRoger command
 **/

import util from "util";
import Config from "../config.js";
import { DB, Guild, Stockpile, Town } from "../db.js";
import {
  ActionRowBuilder,
  PermissionFlagsBits,
  ButtonStyle,
  ChannelType,
  time,
  EmbedBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  roleMention,
  channelMention,
  userMention,
  ButtonBuilder,
  InteractionResponse,
  Integration,
} from "discord.js";

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
    .setName("stockpile")
    .setDescription("Create a new stockpile.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("The stockpile location.")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The stockpile code.")
        .setRequired(true)
        .setMinLength(6)
        .setMaxLength(6)
    ),
  async execute(client, interaction) {
    //console.log(`INT: ${util.inspect(interaction, true, 2, true)}`);
    let _guild = await Guild.findOne({ guild_id: interaction.guildId });

    if (interaction.isChatInputCommand()) {
      let _location = interaction.options.getString("location");
      let _code = interaction.options.getString("code");
      let _date = new Date();

      let _stockpile = await new Stockpile({
        _id: new DB.Types.ObjectId(),
        stockpile_guild: _guild.guild_id,
        stockpile_location: _location,
        stockpile_code: _code,
        stockpile_refresh: _date,
        stockpile_refreshby: interaction.member.id,
      }).save();

      let _town = await Town.findById(_location);

      if (!_town) {
        return;
      }

      _date.setDate(_date.getDate() + 2);

      //send new message
      client.channels.cache
        .get(_guild.guild_stockpiles)
        .send({
          embeds: [
            {
              color: 0x2b2d31,
              author: {
                name: `${_town.town_hex} - ${_town.town_name}`,
                icon_url:
                  _town.town_building == "Seaport"
                    ? "https://i.imgur.com/riii9l5.png"
                    : "https://i.imgur.com/9Tvrj9W.png",
              },
              fields: [
                {
                  name: "",
                  value: `${_stockpile.stockpile_code}`,
                  inline: true,
                },
                {
                  name: "",
                  value: `*Expires ${time(_date, "R")}*`,
                  inline: true,
                },
              ],
            },
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`stockpile_refresh_${_stockpile._id}`)
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`stockpile_delete_${_stockpile._id}`)
                .setLabel("Delete")
                .setStyle(ButtonStyle.Danger)
            ),
          ],
        })
        .then(async (message) => {
          await Stockpile.updateOne(
            { _id: _stockpile._id },
            { $set: { stockpile_post: message.id } }
          );
        });
      interaction.reply({
        embeds: [
          {
            color: _guild.guild_color,
            title: "Stockpile Added!",
          },
        ],
        ephemeral: true,
      });
    } else if (interaction.isAutocomplete()) {
      let _value = interaction.options.getFocused();
      let _choices = await Town.find();
      let _filtered = _choices.filter((c) =>
        c.town_name.toLowerCase().startsWith(_value.toLowerCase())
      );
      if (_filtered.length > 25) {
        _filtered = _filtered.slice(0, 25);
      }

      await interaction.respond(
        _filtered.map((c) => ({
          name: `${c.town_building} - ${c.town_hex} > ${c.town_name}`,
          value: c._id,
        }))
      );
    } else if (interaction.isButton()) {
      //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);
      let _command = interaction.customId.split("_")[1];

      if (_command == "refresh") {
        let _sid = new DB.Types.ObjectId(interaction.customId.split("_")[2]);

        if (await Stockpile.exists({ _id: _sid })) {
          let _refresh = new Date();
          await Stockpile.updateOne(
            { _id: _sid },
            { $set: { stockpile_refresh: _refresh, stockpile_refreshby: interaction.member.id } }
          );
          _refresh.setDate(_refresh.getDate() + 2);

          let _stockpile = await Stockpile.findOne({ _id: _sid });
          //console.log(`STOCK: ${util.inspect(interaction.message.embeds[0], true, null, true)}`);
          let _embed = EmbedBuilder.from(interaction.message.embeds[0]).data;
          _embed.fields = [
            {
              name: "",
              value: `${_stockpile.stockpile_code}`,
              inline: true,
            },
            {
              name: "",
              value: `*Expires ${time(_refresh, "R")}*`,
              inline: true,
            },
          ];
          _embed.footer = {
            text: interaction.member.nickname,
            icon_url: "https://i.imgur.com/ycX41Du.png",
          };

          interaction.message.edit({
            embeds: [_embed],
          });
          return interaction.deferUpdate();
        }
      } else if (_command == "delete") {
        if (!interaction.member.roles.cache.has("1206260504310579230")) {
          interaction.reply({
            embeds: [
              {
                color: 0x0099ff,
                title: "You do not have permissions to perform this action.",
              },
            ],
            ephemeral: true,
          });
        } else {
          let _sid = interaction.customId.split("_")[2];

          const yes = new ButtonBuilder()
            .setCustomId(`stockpile_confirm_yes_${_sid}`)
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success);

          const no = new ButtonBuilder()
            .setCustomId(`stockpile_confirm_no_${_sid}`)
            .setLabel("No")
            .setStyle(ButtonStyle.Danger);

          interaction.reply({
            embeds: [
              {
                color: 0x0099ff,
                title: "Are you sure?",
              },
            ],
            components: [new ActionRowBuilder().addComponents(yes, no)],
            ephemeral: false,
          });
        }
      } else if (_command == "confirm") {
        let _action = interaction.customId.split("_")[2];
        let _sid = new DB.Types.ObjectId(interaction.customId.split("_")[3]);

        if (_action == "yes") {
          let _guild = await Guild.findOne({ guild_id: interaction.guildId });

          if (_guild?.guild_stockpiles && (await Stockpile.exists({ _id: _sid }))) {
            //console.log(`SID: ${util.inspect(interaction.message.id, true, 1, true)}`);
            let _stockpile = await Stockpile.findOne({ _id: _sid });
            if (_stockpile.stockpile_post) {
              await client.channels.cache
                .get(_guild.guild_stockpiles)
                .messages.fetch(_stockpile.stockpile_post)
                .then(async (message) => {
                  message.delete();
                  await Stockpile.deleteOne({ _id: _sid });
                });
            }
          }
        }
        interaction.deleteReply();

        return interaction.deferUpdate();
      }
    }
  },
};
