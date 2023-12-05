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
import { DB, Event, Guild, Stockpile } from "../db.js";
import { ActionRowBuilder, PermissionFlagsBits, ButtonStyle, ChannelType, formatEmoji, time, EmbedBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, roleMention, channelMention, userMention, ButtonBuilder, InteractionResponse, Integration, ComponentBuilder } from "discord.js";

import { encode } from "html-entities";
import numeral from "numeral";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import duration from 'dayjs/plugin/duration.js';
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
import parse from "parse-duration";



const rolesSelect = new RoleSelectMenuBuilder()
  .setCustomId("event_roles")
  .setPlaceholder('Roles')
  .setMinValues(1)
  .setMaxValues(10);

const channelSelect = new ChannelSelectMenuBuilder()
  .setCustomId("event_channel")
  .setPlaceholder("Channel")
  .setMinValues(1)
  .setMaxValues(1)
  .addChannelTypes(ChannelType.GuildText);

const postButton = new ButtonBuilder()
  .setCustomId("event_post")
  .setLabel("Post")
  .setStyle(ButtonStyle.Success);

const dateButton = new ButtonBuilder()
  .setCustomId("event_date")
  .setLabel("Set Date")
  .setStyle(ButtonStyle.Primary);

const cancelButton = new ButtonBuilder()
  .setCustomId("event_cancel")
  .setLabel("Cancel")
  .setStyle(ButtonStyle.Danger);



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

      interaction.reply({ 
        embeds: [{
          color: _color,
          title: _title,
          description: _description.replace(/\\n/g, "\n"),
          fields: [{
            name: `Roles`,
            value: `Any`,
            inline: false
          }, {
            name: `Channel`,
            value: `\u200b`,
            inline: false
          }, {
            name: `Start`,
            value: `\u200b`,
            inline: true
          }, {
            name: `Duration`,
            value: `\u200b`,
            inline: true
          }
        ]
        }],
        components: [
          new ActionRowBuilder().addComponents(rolesSelect),
          new ActionRowBuilder().addComponents(channelSelect),
          new ActionRowBuilder().addComponents(dateButton, cancelButton)
        ],
        ephemeral: false 
      });


    } else if(interaction.isRoleSelectMenu()) {
      let _field = interaction.customId.split("_")[1];
      if(_field == "roles") {
        let _roles = interaction.values;

        let _embed = EmbedBuilder.from(interaction.message.embeds[0]).data;
        if(!_embed.fields) { _embed.fields = []; }
        _embed.fields[0] = {
          name: `Roles`,
          value: `${_roles.map(r => roleMention(r)).join(" ")}`,
          inline: false
        };

        interaction.message.edit({
          embeds:[_embed]
        });
        return interaction.deferUpdate();
      }

    } else if(interaction.isChannelSelectMenu()) {
      let _field = interaction.customId.split("_")[1];
      if(_field == "channel") {
        let _channel = interaction.values[0];

        let _embed = EmbedBuilder.from(interaction.message.embeds[0]).data;
        if(!_embed.fields) { _embed.fields = []; }
        _embed.fields[1] = {
          name: `Channel`,
          value: `${channelMention(_channel)}`,
          inline: false
        };

        //if date set then allow post
        let _components = interaction.message.components;
        if(_embed.fields[2].value != "\u200b" && _components[2].components[0].customId != "event_post") {
          _components = [
            new ActionRowBuilder().addComponents(rolesSelect),
            new ActionRowBuilder().addComponents(channelSelect),
            new ActionRowBuilder().addComponents(postButton, dateButton, cancelButton)
          ]
        }

        interaction.message.edit({
          embeds: [_embed], 
          components: _components
        });
        return interaction.deferUpdate();
      }



    } else if(interaction.isModalSubmit()) {
      let _field = interaction.customId.split("_")[1];

      if(_field == "date") {
        let _starttime = dayjs(interaction.fields.getTextInputValue('starttime'), "YYYY-MM-DD HH:mm");
        let _duration = parse(interaction.fields.getTextInputValue('duration'));

        let _embed = EmbedBuilder.from(interaction.message.embeds[0]).data;
        if(!_embed.fields) { _embed.fields = []; }
        _embed.fields[2] = {
          name: `Start`,
          value: `${_starttime}`,
          inline: true
        };
        _embed.fields[3] = {
          name: `Duration`,
          value: `${dayjs.duration(_duration).format('HH:mm')}`,
          inline: true
        };

        //if channel set then allow post
        let _components = interaction.message.components;
        if(_embed.fields[1].value != "\u200b" && _components[2].components[0].customId != "event_post") {
          _components = [
            new ActionRowBuilder().addComponents(rolesSelect),
            new ActionRowBuilder().addComponents(channelSelect),
            new ActionRowBuilder().addComponents(postButton, dateButton, cancelButton)
          ]
        }

        interaction.message.edit({
          embeds:[_embed]
        });
        return interaction.deferUpdate();
      }


    } else if(interaction.isButton()) {
      let _command = interaction.customId.split("_")[1];

      if(_command == "post") {
        let _yes = interaction.message.guild.emojis.cache.find(e => e.name === 'yes');
        let _no = interaction.message.guild.emojis.cache.find(e => e.name === 'no');
        let _maybe = interaction.message.guild.emojis.cache.find(e => e.name === 'maybe');

        let _embed = EmbedBuilder.from(interaction.message.embeds[0]).data;
        _embed.fields[4] = {
          name: ``,
          value: `\u200b`,
          inline: false
        };
        _embed.fields[5] = {
          name: `${formatEmoji(_yes.id)} Accepted`,
          value: `\u200b`,
          inline: true
        };
        _embed.fields[6] = {
          name: `${formatEmoji(_no.id)} Declined`,
          value: `\u200b`,
          inline: true
        };
        _embed.fields[7] = {
          name: `${formatEmoji(_maybe.id)} Tentative`,
          value: `\u200b`,
          inline: true
        };

        let _start = dayjs(_embed.fields[2].value);

        //remove channel
        let _channel = _embed.fields[1].value.replace(/\D/g, "");
        _embed.fields.splice(1, 1);

        if(_embed.fields[0].value == "Any") {
          _embed.fields.splice(0, 1);
        }

        client.channels.cache.get(_channel).send({
          embeds:[_embed],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`event_react_yes`)
                .setEmoji(_yes.id)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`event_react_no`)
                .setEmoji(_no.id)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`event_react_maybe`)
                .setEmoji(_maybe.id)
                .setStyle(ButtonStyle.Secondary)
            )
          ]
        }).then(async(message) => {
          await new Event({
            _id: new DB.Types.ObjectId(),
            event_guild: interaction.guildId,
            event_start: _start,
            event_post: message.id
          }).save();
        });
        interaction.deleteReply();
        return interaction.deferUpdate();

      } else if(_command == "date") {
        const modal = new ModalBuilder()
          .setCustomId('event_date')
          .setTitle('Event Start / Duration');

        const starttime = new TextInputBuilder()
          .setCustomId('starttime')
          .setLabel("Event Start")
          .setPlaceholder("YYYY-MM-DD HH:MM")
          .setStyle(TextInputStyle.Short);

        const duration = new TextInputBuilder()
          .setCustomId('duration')
          .setLabel("Event Duration")
          .setPlaceholder("1 Hour")
          .setStyle(TextInputStyle.Short);

        modal.addComponents(
          new ActionRowBuilder().addComponents(starttime), 
          new ActionRowBuilder().addComponents(duration)
        );

        await interaction.showModal(modal);

      } else if(_command == "cancel") {
        interaction.deleteReply();
        return interaction.deferUpdate();

      } else if(_command == "react") {
        let _embed = EmbedBuilder.from(interaction.message.embeds[0]).data;
        let _yes = _embed.fields.find(f => f.name.includes("Accepted")).value.split("\n");
        let _no = _embed.fields.find(f => f.name.includes("Declined")).value.split("\n");
        let _maybe = _embed.fields.find(f => f.name.includes("Tentative")).value.split("\n");

        let y = _yes.indexOf("\u200b"); if(y > -1) { _yes.splice(y, 1); }
        let n = _no.indexOf("\u200b"); if(n > -1) { _no.splice(n, 1); }
        let m = _maybe.indexOf("\u200b"); if(m > -1) { _maybe.splice(m, 1); }

        let _reaction = interaction.customId.split("_")[2];
        if(_reaction == "yes") {
            let y = _yes.indexOf(userMention(interaction.member.id)); if(y < 0) { _yes.push(userMention(interaction.member.id)); }
            let n = _no.indexOf(userMention(interaction.member.id)); if(n > -1) { _no.splice(n, 1); }
            let m = _maybe.indexOf(userMention(interaction.member.id)); if(m > -1) { _maybe.splice(m, 1); }
        } else if(_reaction == "no") {
            let y = _yes.indexOf(userMention(interaction.member.id)); if(y > -1) { _yes.splice(y, 1); }
            let n = _no.indexOf(userMention(interaction.member.id)); if(n < 0) { _no.push(userMention(interaction.member.id)); }
            let m = _maybe.indexOf(userMention(interaction.member.id)); if(m > -1) { _maybe.splice(m, 1); }
        } else if(_reaction == "maybe") {
            let y = _yes.indexOf(userMention(interaction.member.id)); if(y > -1) { _yes.splice(y, 1); }
            let n = _no.indexOf(userMention(interaction.member.id)); if(n > -1) { _no.splice(n, 1); }
            let m = _maybe.indexOf(userMention(interaction.member.id)); if(m < 0) { _maybe.push(userMention(interaction.member.id)); }
          }
        _embed.fields.find(f => f.name.includes("Accepted")).value = _yes.length > 0 ? _yes.join("\n") : "\u200b";
        _embed.fields.find(f => f.name.includes("Declined")).value = _no.length > 0 ? _no.join("\n") : "\u200b";
        _embed.fields.find(f => f.name.includes("Tentative")).value = _maybe.length > 0 ? _maybe.join("\n") : "\u200b";

        interaction.message.edit({
          embeds:[_embed]
        });
        return interaction.deferUpdate();

      }

    }


  }
};
