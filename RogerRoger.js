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
import { DB, Guild, Stockpile } from "./db.js";

import { ActivityType, Client, Collection, Events, GatewayIntentBits, Routes, REST, ActionRowBuilder, ButtonStyle, ButtonBuilder, time, userMention, channelMention } from "discord.js";
import BotCommands from "./BotCommands/BotCommands.js";
import BotEvents from "./BotEvents/BotEvents.js";

import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
let Scheduler = new ToadScheduler();

import minimist from "minimist";
let argv = minimist(process.argv.slice(2), {
  string: [],
  boolean: ["register"],
  alias: { r: "register" },
  default: { "register": false },
  unknown: false
});

//register bot commands
if(argv.register) {
  const rest = new REST().setToken(Config.discord.token);
  (async () => {
    try {
      const botCommands = [];
      for (let [key, value] of Object.entries(BotCommands)) {
        botCommands.push(value.data.toJSON());
      }
      const data = await rest.put(Routes.applicationCommands(Config.discord.client_id), {body: botCommands});
      console.log(`Reloaded ${data.length} discord commands.`);
    } catch (err) {
      console.error(err);
    }
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
      GatewayIntentBits.MessageContent
    ]
  });


  //*************************************************************************************************************
  // DBJob/DBTask
  //*************************************************************************************************************
  let db_task = new AsyncTask("DBTask", async() => {
    console.log("DBJob running DBTask");

    if(await Guild.exists({ guild_id: Config.discord.guild_id })) {
      let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });

      //update stockpile codes
      if(_guild?.guild_stockpiles) {
        
        let _stockpiles = await Stockpile.find();
        for(let _s in _stockpiles) {
          //delete old message
          if(_stockpiles[_s].stockpile_post) {
            try {
              await client.channels.cache.get(_guild.guild_stockpiles).messages.fetch(_stockpiles[_s].stockpile_post).then(message => message.delete());
            } 
            catch(err) {
              console.log(`Error: ${err}`);
            }
          }

          let _refresh = new Date(_stockpiles[_s].stockpile_refresh);
          _refresh.setDate(_refresh.getDate() + 2);

          //send new message
          client.channels.cache.get(_guild.guild_stockpiles).send({ 
            embeds: [{
              color: 0x0099FF,
              title: `${_stockpiles[_s].stockpile_hex} - ${_stockpiles[_s].stockpile_town}`,
              fields: [{ 
                name: "", 
                value: `${client.emojis.cache.find(emoji => emoji.name === _stockpiles[_s].stockpile_building.replace(/\s/g, ""))}`, 
                inline: true 
              },{ 
                name: "", 
                value: `**${_stockpiles[_s].stockpile_code}**`, 
                inline: true 
              },{ 
                name: "", 
                value: `*${time(_refresh, "R")}*`, 
                inline: true 
              }]
            }],
            components: [new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`stockpiles_refresh_${_stockpiles[_s]._id}`)
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`stockpiles_delete_${_stockpiles[_s]._id}`)
                .setLabel("Delete")
                .setStyle(ButtonStyle.Danger))]
          }).then(async(message) => {
            await Stockpile.updateOne({ _id: _stockpiles[_s]._id }, { $set: { stockpile_post: message.id } });
          });

        }

      }
    }

    return;
  });
  



  let dsCommands = new Collection();
  for(let [name, command] of Object.entries(BotCommands)) {
    if(BotCommands[name]) {
      if("data" in command && "execute" in command) {
        dsCommands.set(command.data.name, command);
      }
      else {
        console.log(`[WARNING] The command ${name} is missing a required "data" or "execute" property.`);
      }
    }
    else {
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


  client.on("messageCreate", (msg) => {
    if(msg.channelId === Config.discord.channel_id && !msg.author.bot) {
      console.log("text: ", util.inspect(msg.cleanContent, true, null, true));
    }
  });


  client.on('voiceStateUpdate', (oldState, newState) => {
    //check for bot
    if (oldState.member.user.bot) { return; }

    let message = ":loud_sound:";
    if (newState.channelId === null) {
      message += ` ${userMention(oldState.member.user.id)} left ${channelMention(oldState.channelId)}`;
    } else if (oldState.channelId === null) {
      message += ` ${userMention(oldState.member.user.id)} joined ${channelMention(newState.channelId)}`;
    } else {
      message += ` ${userMention(oldState.member.user.id)} moved from ${channelMention(oldState.channelId)} to ${channelMention(newState.channelId)}`;
    }
    client.channels.cache.get(Config.discord.channel_id).send(message);
  });


  client.on(Events.InteractionCreate, async (interaction) => {
    if(
      !interaction.isChatInputCommand() && 
      !interaction.isButton() && 
      !interaction.isStringSelectMenu() && 
      !interaction.isChannelSelectMenu() && 
      !interaction.isRoleSelectMenu() && 
      !interaction.isModalSubmit()
    ) { return; }

    //console.log(interaction);

    const command = interaction.isChatInputCommand() ? interaction.client.commands.get(interaction.commandName) : interaction.client.commands.get(interaction.customId.split("_")[0]);

    if(!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
    }
    else {
      try {
        await command.execute(client, interaction);
      }
      catch(err) {
        console.error(err);
        await interaction.reply({content: "There was an error while executing this command!", ephemeral: true});
      }
    }

  });

  client.on(Events.ClientReady, async() => {
    console.log(`Discord: Logged in as ${client.user.username}!`);
    client.user.setActivity("your mother undress", { type: ActivityType.Watching });
    //client.channels.cache.get(Config.discord.channel_id).send(`${client.user.username} reporting for duty!`);
    Scheduler.addSimpleIntervalJob(new SimpleIntervalJob(
      { minutes: Config.timers.database, runImmediately: true },
      db_task,
      { id: "DBJob", preventOverrun: true }
    ));
  });

  // *******************************************************************************************************************
  // Run bot
  // *******************************************************************************************************************
  console.log("Starting...");
  await client.login(Config.discord.token);

});
