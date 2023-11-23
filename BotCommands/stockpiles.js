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
 * @name stockpiles.js
 * @version 2023/04/20
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
    .setName("stockpiles")
    .setDescription("Configure stockpiles.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a stockpile.")
        .addStringOption(option => 
          option
            .setName("code")
            .setDescription("The stockpile code.")
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("delete")
        .setDescription("Delete a stockpile."))
    .addSubcommand(subcommand =>
      subcommand
        .setName("channel")
        .setDescription("Set the channel to post stockpiles to.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to post to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))),

  async execute(client, interaction) {
    //console.log(`INT: ${util.inspect(interaction, true, 2, true)}`);
    let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });

    if (interaction.isChatInputCommand()) {
      let _subcommand = interaction.options._subcommand;
      if(_subcommand == "add") {
        let _code = interaction.options.getString("code");

        let _options = [];
        for(let _hex in Config.foxhole) {
          //console.log(`HEX: ${util.inspect(Config.foxhole[_hex], true, null, true)}`);
          if(Config.foxhole[_hex].faction == _guild.guild_faction) {
            _options.push(new StringSelectMenuOptionBuilder({
              label: `${Config.foxhole[_hex].name}`, 
              value: `${_hex}`
            }));
          }
        }
        const select = new StringSelectMenuBuilder()
          .setCustomId("stockpiles_add_hex")
          .setPlaceholder("Select hex");
        select.options = _options;

        interaction.reply({ embeds: [{
          color: 0x2B2D31,
          title: "Add Stockpile",
          fields: [
            { name: "", value: "**Hex:**", inline: false },
            { name: "", value: "**Town:**", inline: false },
            { name: "", value: "**Building:**", inline: false },
            { name: "", value: `**Code:** ${_code}`, inline: false }
          ]
        }], components: [new ActionRowBuilder().addComponents(select)], ephemeral: false });

      } else if(_subcommand == "channel") {
        let _channel = interaction.options.getChannel("channel").id;
        await Guild.updateOne({ guild_id: Config.discord.guild_id }, { $set: { guild_stockpiles: _channel } });
        interaction.reply({ content: `Set ${channelMention(_channel)} as the stockpiles channel.`, ephemeral: true });

      }
      
    } else if(interaction.isStringSelectMenu()) {
      //console.log(`CUSTOMID: ${util.inspect(interaction.customId, true, 1, true)}`);
      let _command = interaction.customId.split("_")[1];
      let _field = interaction.customId.split("_")[2];
      
      if(_command == "add") {
        if(_field == "hex") {
          let _hex = interaction.values[0];

          interaction.message.embeds[0].fields[0].value = `**Hex:** ${Config.foxhole[_hex].name}`;

          let _options = [];
          for(let _town in Config.foxhole[_hex].towns) {
            //console.log(`TOWN: ${util.inspect(Config.foxhole[_hex].towns[_town], true, null, true)}`);
            _options.push(new StringSelectMenuOptionBuilder({
              label: `${Config.foxhole[_hex].towns[_town].name}`, 
              value: `${_town}`
            }));
          }
          const select = new StringSelectMenuBuilder()
            .setCustomId("stockpiles_add_town")
            .setPlaceholder("Select town");
          select.options = _options;

          interaction.message.edit({ embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(select)], ephemeral: false });
          return interaction.deferUpdate();
        
        } else if(_field == "town") {
          let _hex = Config.foxhole.map(h => h.name).indexOf(interaction.message.embeds[0].fields[0].value.replace("**Hex:** ",""));
          let _town = interaction.values[0];

          console.log(`HEX: ${util.inspect(Config.foxhole, true, null, true)}`);

          interaction.message.embeds[0].fields[1].value = `**Town:** ${Config.foxhole[_hex].towns[_town].name}`;

          let _options = [];
          for(let _building in Config.foxhole[_hex].towns[_town].buildings) {
            //console.log(`BUILDING: ${util.inspect(Config.foxhole[_hex].towns[_town].buildings[_building], true, null, true)}`);
            _options.push(new StringSelectMenuOptionBuilder({
              label: `${Config.foxhole[_hex].towns[_town].buildings[_building]}`, 
              value: `${_building}`
            }));
          }
          const select = new StringSelectMenuBuilder()
            .setCustomId("stockpiles_add_building")
            .setPlaceholder("Select building");
          select.options = _options;

          interaction.message.edit({ embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(select)], ephemeral: false });
          return interaction.deferUpdate();
          
        } else if(_field == "building") {
          
          let _hex = Config.foxhole.map(h => h.name).indexOf(interaction.message.embeds[0].fields[0].value.replace("**Hex:** ",""));
          let _town = Config.foxhole[_hex].towns.map(t => t.name).indexOf(interaction.message.embeds[0].fields[1].value.replace("**Town:** ",""));
          let _building = interaction.values[0];

          interaction.message.embeds[0].fields[2].value = `**Building:** ${Config.foxhole[_hex].towns[_town].buildings[_building]}`;

          const save = new ButtonBuilder()
            .setCustomId("stockpiles_add_save")
            .setLabel("Save")
            .setStyle(ButtonStyle.Success);
    
          const cancel = new ButtonBuilder()
            .setCustomId("stockpiles_add_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger);

          interaction.message.edit({ embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(save, cancel)], ephemeral: false });
          return interaction.deferUpdate();

        }
      }

    } else if(interaction.isButton()) {
      //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);
      let _command = interaction.customId.split("_")[1];
      
      if(_command == "add") {
        let _field = interaction.customId.split("_")[2];

        let _hex = interaction.message.embeds[0].fields[0].value.replace("**Hex:** ","");
        let _town = interaction.message.embeds[0].fields[1].value.replace("**Town:** ","");
        let _building = interaction.message.embeds[0].fields[2].value.replace("**Building:** ","");
        let _code = interaction.message.embeds[0].fields[3].value.replace("**Code:** ","");

        if(_field == "save") {
          let _stockpile = await new Stockpile({
            _id: new DB.Types.ObjectId(),
            stockpile_hex: _hex,
            stockpile_town: _town,
            stockpile_building: _building,
            stockpile_code: _code
          }).save();

          //let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });

          let _refresh = new Date(_stockpile.stockpile_refresh);
          _refresh.setDate(_refresh.getDate() + 2);

          //console.log(`RES: ${util.inspect(result, true, null, true)}`);
          //send new message
          client.channels.cache.get(_guild.guild_stockpiles).send({ 
            embeds: [{
              color: 0x2B2D31,
              author: {
                name: `${_stockpile.stockpile_hex} - ${_stockpile.stockpile_town}`,
                icon_url: _stockpile.stockpile_building == "Seaport" ? 'https://i.imgur.com/riii9l5.png' : 'https://i.imgur.com/9Tvrj9W.png'
              },
              fields: [{
                  name:"",
                  value: `${_stockpile.stockpile_code}`,
                  inline: true
                },
                {
                  name:"",
                  value: `*Expires ${time(_refresh, "R")}*`,
                  inline: true
                }

              ]
            }],
            components: [new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`stockpiles_refresh_${_stockpile._id}`)
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`stockpiles_delete_${_stockpile._id}`)
                .setLabel("Delete")
                .setStyle(ButtonStyle.Danger))]
          }).then(async(message) => {
            await Stockpile.updateOne({ _id: _stockpile._id }, { $set: { stockpile_post: message.id } });
          });
          
          interaction.message.delete();
          return interaction.deferUpdate();
        
        }
        

      } else if(_command == "refresh") {
        let _sid = new DB.Types.ObjectId(interaction.customId.split("_")[2]);

        if(await Stockpile.exists({_id: _sid})) {
          let _refresh = new Date();
          await Stockpile.updateOne({_id: _sid}, {$set: {stockpile_refresh: _refresh}});
          _refresh.setDate(_refresh.getDate() + 2);

          let _stockpile = await Stockpile.findOne({_id: _sid});
          //console.log(`STOCK: ${util.inspect(_stockpile, true, null, true)}`);
          let _embed = EmbedBuilder.from(interaction.message.embeds[0]);
          _embed.fields = [{
            name:"",
            value: `${_stockpile.stockpile_code}`,
            inline: true
          },
          {
            name:"",
            value: `*Expires ${time(_refresh, "R")}*`,
            inline: true
          }];

          interaction.message.edit({
            embeds:[_embed]
          });
          return interaction.deferUpdate();

        }


      } else if(_command == "delete") {
        let _sid = interaction.customId.split("_")[2];

        const yes = new ButtonBuilder()
          .setCustomId(`stockpiles_confirm_yes_${_sid}`)
          .setLabel("Yes")
          .setStyle(ButtonStyle.Success);
    
        const no = new ButtonBuilder()
          .setCustomId(`stockpiles_confirm_no_${_sid}`)
          .setLabel("No")
          .setStyle(ButtonStyle.Danger);

        interaction.reply({ embeds: [{
          color: 0x0099FF,
          title: "Are you sure?",
          fields:[]
        }], components: [new ActionRowBuilder().addComponents(yes, no)], ephemeral: true });



      } else if(_command == "confirm") {
        let _action = interaction.customId.split("_")[2];
        let _sid = new DB.Types.ObjectId(interaction.customId.split("_")[3]);

        if(_action == "yes") {
          let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });

          console.log(`GUILD: ${util.inspect(await Stockpile.exists({_id: _sid}), true, 1, true)}`);

          if(_guild?.guild_stockpiles && await Stockpile.exists({_id: _sid})) {

            console.log(`SID: ${util.inspect(_sid, true, 1, true)}`);

            let _stockpile = await Stockpile.findOne({_id: _sid});
            if(_stockpile.stockpile_post) {
              await client.channels.cache.get(_guild.guild_stockpiles).messages.fetch(_stockpile.stockpile_post).then(message => message.delete());
            }
            await Stockpile.deleteOne({_id: _sid});

            return interaction.deferUpdate();
          } else {
            return interaction.deferUpdate();
          }
        } else {
          return interaction.deferUpdate();
        }
      }




    } 


  }
};

