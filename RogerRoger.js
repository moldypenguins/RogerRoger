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
 * @name RogerRoger.js
 * @version 2023-07-04
 * @summary The Old Republic
 **/

import util from "util";

import Config from "./config.js";
import { DB, Town, Guild, Stockpile } from "./db.js";

import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Routes,
  REST,
  ActionRowBuilder,
  ButtonStyle,
  ButtonBuilder,
  time,
  userMention,
  roleMention,
  channelMention,
} from "discord.js";
import BotCommands from "./BotCommands/BotCommands.js";
import BotEvents from "./BotEvents/BotEvents.js";

import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
let Scheduler = new ToadScheduler();

import minimist from "minimist";
import { config } from "process";
let argv = minimist(process.argv.slice(2), {
  string: [],
  boolean: ["register"],
  alias: { r: "register" },
  default: { register: false },
  unknown: false,
});

//register bot commands
if (argv.register) {
  const rest = new REST().setToken(Config.discord.token);
  (async () => {
    try {
      const botCommands = [];
      for (let [key, value] of Object.entries(BotCommands)) {
        botCommands.push(value.data.toJSON());
      }
      const data = await rest.put(Routes.applicationCommands(Config.discord.client_id), {
        body: botCommands,
      });
      console.log(`Reloaded ${data.length} discord commands.`);
    } catch (err) {
      console.error(err);
    }
    process.exit(0);
  })();
}

//connect to database
DB.connection.once("open", async () => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
    ],
  });

  const _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });

  //*************************************************************************************************************
  // DBJob/DBTask
  //*************************************************************************************************************
  let db_task = new AsyncTask("DBTask", async () => {
    console.log("DBJob running DBTask");

    let _guilds = await Guild.find();
    for (let _id in _guilds) {
      //update stockpile codes
      if (_guilds[_id].guild_stockpiles) {
        let _stockpiles = await Stockpile.find({ stockpile_guild: _guilds[_id].guild_id });
        for (let _s in _stockpiles) {
          //delete old message
          if (_stockpiles[_s].stockpile_post) {
            try {
              await client.channels.cache
                .get(_guilds[_id].guild_stockpiles)
                .messages.fetch(_stockpiles[_s].stockpile_post)
                .then((message) => message.delete());
            } catch (err) {
              console.log(`Error: ${err}`);
            }
          }

          let _town = await Town.findById(_stockpiles[_s].stockpile_location);
          if (!_town) {
            return;
          }

          let _refresh = new Date(_stockpiles[_s].stockpile_refresh);
          _refresh.setDate(_refresh.getDate() + 2);

          let _member = client.guilds.cache
            .get(_guild.guild_id)
            .members.cache.get(_stockpiles[_s].stockpile_refreshby);

          //send new message
          client.channels.cache
            .get(_guilds[_id].guild_stockpiles)
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
                      value: `${_stockpiles[_s].stockpile_code}`,
                      inline: true,
                    },
                    {
                      name: "",
                      value: `*Expires ${time(_refresh, "R")}*`,
                      inline: true,
                    },
                  ],
                  footer: {
                    text: _member.nickname,
                    icon_url: "https://i.imgur.com/ycX41Du.png",
                  },
                },
              ],
              components: [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId(`stockpile_refresh_${_stockpiles[_s]._id}`)
                    .setLabel("Refresh")
                    .setStyle(ButtonStyle.Success),
                  new ButtonBuilder()
                    .setCustomId(`stockpile_delete_${_stockpiles[_s]._id}`)
                    .setLabel("Delete")
                    .setStyle(ButtonStyle.Danger)
                ),
              ],
            })
            .then(async (message) => {
              await Stockpile.updateOne(
                { _id: _stockpiles[_s]._id },
                { $set: { stockpile_post: message.id } }
              );
            });
        }
      }
    }

    return;
  });

  let dsCommands = new Collection();
  for (let [name, command] of Object.entries(BotCommands)) {
    if (BotCommands[name]) {
      if ("data" in command && "execute" in command) {
        dsCommands.set(command.data.name, command);
      } else {
        console.log(
          `[WARNING] The command ${name} is missing a required "data" or "execute" property.`
        );
      }
    } else {
      console.log(`[WARNING] The command ${name} was not found.`);
    }
  }
  client.commands = dsCommands;

  //handle discord events
  for (const ev in BotEvents) {
    //console.error(`HERE: ${util.inspect(BotEvents[ev], true, null, true)}`);
    if (BotEvents[ev].once) {
      client.once(BotEvents[ev].name, (...args) => BotEvents[ev].execute(client, ...args));
    } else {
      client.on(BotEvents[ev].name, (...args) => BotEvents[ev].execute(client, ...args));
    }
  }

  client.on(Events.InteractionCreate, async (interaction) => {
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isChannelSelectMenu() &&
      !interaction.isRoleSelectMenu() &&
      !interaction.isModalSubmit() &&
      !interaction.isAutocomplete()
    ) {
      return;
    }

    const command =
      interaction.isChatInputCommand() || interaction.isAutocomplete()
        ? interaction.client.commands.get(interaction.commandName)
        : interaction.client.commands.get(interaction.customId.split("_")[0]);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
    } else {
      try {
        await command.execute(client, interaction);
      } catch (err) {
        console.error(`[ERROR] ${err.code}: ${err.message}`);
        await client.channels.cache
          .get(_guild.guild_logs)
          .send(`There was an error while executing this command!\n${err.code}: ${err.message}`);
      }
    }
  });

  client.on(Events.ClientReady, async () => {
    console.log(`Discord: Logged in as ${client.user.username}!`);
    client.user.setActivity("Surrender Jedi dogs!", { type: ActivityType.Custom });
    //let _guild = await Guild.findOne({guild_id: interaction.guildId});
    //client.channels.cache.get(_guild.guild_logs).send(`${client.user.username} reporting for duty!`);
    Scheduler.addSimpleIntervalJob(
      new SimpleIntervalJob({ minutes: Config.timers.database, runImmediately: true }, db_task, {
        id: "DBJob",
        preventOverrun: true,
      })
    );
  });

  // *******************************************************************************************************************
  // Run bot
  // *******************************************************************************************************************
  console.log("Starting...");
  await client.login(Config.discord.token);
});

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  process.exit(0);
});
