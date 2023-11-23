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

    let message = ":loud_sound: ";
    let color = 0x0099ff;
    if (newState.channelId === null) {
      message += `${userMention(oldState.member.user.id)} left ${channelMention(oldState.channelId)}`;
      color = 0xff9900;
    } else if (oldState.channelId === null) {
      message += `${userMention(oldState.member.user.id)} joined ${channelMention(newState.channelId)}`;
      color = 0x00ff99;
    } else {
      message += `${userMention(oldState.member.user.id)} moved from ${channelMention(oldState.channelId)} to ${channelMention(newState.channelId)}`;
      color = 0x0099ff;
    }
    client.channels.cache.get(Config.discord.channel_id).send({embeds: [
      {
        color: color,
        description: message,
        author: {
          name: 'Voice State Update',
          icon_url: 'data:image/gif;base64,R0lGODlhMAAwAPYAAAAAACGK0SKL0SCL0iGM0iOM0iKN0ySN0iSN0ySO0yWO1CWP1CaR1SaQ1iiU1yKQ2iKS3SeV3SeW3huV6xyW6x2X6x2X7B6Y7B6Y7R+Z7SKU4CKU4SWX4iiX4SaY4yeY4yeY5CSZ5yWZ5yiZ4yiZ5Cia5SOY6COZ6SCa7SCa7iGb7iKc7yOd7ymd6ime6imf6yOd8CSe8CWf8Sqg7Sag8Sag8ieh8iii8iii8ymj8ymj9Cqk9EHI8ELJ8ULK8UPL8kjW90vc+lDm/1Hn/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BA0EAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAMAAwAAAH/oAAgoOEhYaHiImKi4yNjo+QkZKTjDs7OTg4NjY1NDIyMTEsKysqKikoGRkXFxYUFBOTlpY5mDecnqAxMKOlKSmqrBYVr5KzljqYmjY0nqG8pKaoGRitrsbHtJibnZ/Po9Kpq63Y2Ze2m7nf0aeq1eXmyZnc6tClp+Lw5uc4t9269k4B07dP3rJmAHtJI7jv0jxc3naxY9iwVr90Ee1RbGiQnowQGjacWLGxIT9uIh4EGADBREmTFjVxEBCEBwEIL006xMGhgBAhPgzk1FnLw4GfQF+6KEGiqdOnID4gQCpkSCSdLiQsUMC1q1euCaj+hKSzxAIgYtOqHetIJwkFfmvjim1r8q3cu0LoNrSLN67efXz7qv1rzixawXMJZ8u6wIHjx5AfpyWLtcSIy5gzX4aL1CplnaB3BP4xFDTfHwxKu1UQpAeDDqpNtoiwoEGHF7FlkygxY0fu0L6vAh9u6Xdo46CR61RuknlD5/ugm5NF/Dil69iza9/OvXujQAAh+QQNBAAAACwAAAAAMAAwAIYAAAAhitEhjNQhjNUijtcljtQmkNUmkdcolNcmktgmktknlNshkt8ik98kk9wkk94llN0mld0nlt4qm9krmtotntwbleoblesclusdl+sdl+wemOwemO0fme0ilOAileMnl+All+MjluQol+EnmOMomOIomeMomeQom+Ypm+cimekjm+sgmu0gmu4hm+4inO8jne8lnu4nn+4pnOgon+4jnfAknvAln/EpoO4qoe8xqOAyqeEyquE0reM3teY3tec5uOc5t+g7uukmoPEmoPInofIqovAqovEoovIoovMpo/MqpPMpo/QqpPRO4v1O4/1Q5v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/oAAgoOEhYaHiImKi4yNjo+QkZKTjE1MSklJRUVDQzc2NjUwLy8uLi0sHRwbGhoYGBaTTbNNSpibRJ6foaSmqB0dG6yvF5K0s7aZm7qgor0tLcDCGhkYxsfIykW5N5/Opaepq63X2LWYSNvMoaO+qcEb5eaX2p27377AHPLm55rq3UCNAveLX79k6TgFZPeshcF+9P5x8zbQ1MN+/nCtc+biIsaIy27EEOHhw4oXHjHW0kYkBIEAAxioSKkSoYwHE574ENCApkp6NBzogALlxwCfKmvhgDCUKJCUS2acmEq16gkSEXYQJZoyxYICYMOKDctjK1dIKo+MoODErNu3h2bRYswhoSzcu24fqaRrF69fKI721v37N/DcwYTv6sWolm3it3IxejWAoLLly5V75I3cL+oJE6BDizaB+CznpIL7CkGalC/RIAdYqzQCosIT2CVkq0ShoEACEzh0M5aawkgT4ahnIU++HHXzpM9VRsc4vV91c9exyUrOXTml7+DDix9PvnyjQAAh+QQNBAAAACwAAAAAMAAwAIYAAAAgi9Ihi9IjjdMkjtMijNQjj9QkjdQljtQlj9Qhj9kkkNUmkNUmkdcok9colNcikdsjkdsnld0nlt4nlt8oltgrmtoblesclusdl+sdl+wemOwemO0fme0ilOAilOEil+YkluQmmOMnmOMjmOcmmOQomeMomeQomuUom+Ypm+ckmegmm+kgmu0gmu4hm+4inO8jne8pnOgpneopnuopn+sqn+wjnfAknvAln/EmoPEmoPInofIoovIoovMpo/Mpo/QqpPRDzPJF0PRG0fVG0vVG0/VH0/ZL2/pN4fxO4f1Q5v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/oAAgoOEhYaHiImKi4yNjo+QkZKTlJWTQUFAPz4+PDw6OTk4ODcxMDAvLi0dHRsbGhgYF5SYmD+bnjugoqWnL6msHK8ZGJe1tps9PLqho72/qqyvsJLHx5udn6DOpqguLtKv1da1t9nMojjd0KvC4+SYmpyeu9yoqasd7/DI5/W998Dt4xfEnDJ0znylGkiw4Dxt6QC+YNjQXC5QKzx8IHGKYkN52VhEEBAAAogYHhs67FSiQJEhBiCESKnSnIgBSZYYWaCApkpNJQ7k1FmBZg0UJ5IqXXpiBIKhS5CktEGBAYKrWLNeJQB1yZJIBFU0EOK1rNmzaCERRJGgK9q3hmYfrW0Lt+5ZR3Pd2n2Llx9bvXvj9oUnlmxgvnL5UWXg4IHjx5AdK7mrluBRE5gza8ZM16tUsCpV/vV6xILP0KOPPJBwWmUKBkWIPKAgo3XDGhMSMKAwI4jthjROoKiB6XfoWsaP+watXHny489DR1c5vaGx5tSvYydoqbv37+DDix9PHlIgACH5BA0EAAAALAAAAAAwADAAhgAAACCJ0CGM1CCN1yWO1CWP1CGO2CGP2SOP2CaQ1ieR1iaR1yiU1ySQ2CWR2SaS2SaT2ieU2yeU3CSU3iiZ2Cma2Syd2y2e3BuV6xyW6x2X6x2X7B6Y7B6Y7R+Z7SKU4COU4SGU4iKV4yKW5SiX4SeY5CiY4iiZ4yiZ5Cia5Sia5iib5imb5yab6SWb6iec6iCa7SCa7iGb7iOc7iKc7yOd7yae7imd6Sid6imd6ime6iOd8CSe8CWf8Sqg7Sqh7zi25zm46Dq66Sag8Sag8ieh8iqi8Cqi8Sii8iii8ymj8yqj8ymj9Cqk9D/E7kDF70HH8Evd+kzd+0zf+03f/FDm/1Dn/1Hn/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf+gACCg4SFhoeIiYqLjI2Oj5CRkpOUlZRNSkpJRUVEQz09PDs1NDQyMTEeHhwcGxkZGJVNs0yam0WfoaKlMqeqrBsar5ezs7acQ588oqS9MTC/G67ExZiaSJ25zLy+q63U1ZhJt9rbztAdHODhmbeeuqO8z6rr4bVJ2O+6pKa+9eHiyCkzd+ofwHac9G0zZRDgPXI9XID4MKJUQ4DWbtmYICDAAREzLmK8h6QFgiBRKhgIIRKjuBcNnFSZUmFAS5dKcDiQOZOCwR8rUAgdShRFiQdPqiid8u+IiQUEokqdKjWp0ipWJmHUEQHI1a9gw1a5ImkrBKti014lC8ksWrWBatk6cgu3rtxGdOumvYsXIFevesPy7RvO6QIFDBIrXpwYytesZTECPUG5smXKSK9Suekyx1mlVCxwpkvlAoTRfiEIkXIhggrU4YyQSFBAAoslsMP5SIHixqzcLn9rDU7cJfDgx40PL868WHKMzwFGDyerOXNL2LNr3869u/fvkQIBACH5BA0EAAAALAAAAAAwADAAhgAAACCJ0CGM1CCM1SKO1ySO1CWO1CWP1CaR1SaR1yiU1yaS2CaS2SeU2yGS3iST3CST3SWU3SaV3SeW3iqb2Sua2i2e3ByW6x2X6x2X7B6Y7B6Y7R+Z7SGR4CKT4CKU4SeX4CSW4yOW5CiX4SeY4yiY4iiZ4yiZ5Cib5imb5yGZ6SKa6yCa7SCa7iGb7iKc7yOd7ySd7ief7ymc6Cmd6Sif7Sif7iOd8CSe8CWf8Sqg7iqh7zCo4DGo4DKp4TKq4TSt4za05je15zm36Du+6jy/7Cag8Sag8ieh8iqi8Cqi8Sii8iii8ymj8yqj8iqk8ymj9Cqk9E7h/U7i/U7j/VDm/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf+gACCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXl1FRTU1MSEhHRjk4ODcwLy4uLSwcGxoZGBcXlZqaUJ1LoKKjpi+oqxwcrxmylLW1nZ5Iu6Q3vqktwRqvs5PHyJ2foaOlp9CsrhnG18hMysw4p6iq0uPkmpznos3eqqzu71G3TLnbvOr28OXbZO4TOmfrBA6Mp01UDBEePqxwoXDgPk+hQhAIMMCBiooDN2WTAYHClCACOoAMua/GAx5VqggRsDLkJhsResSsQgTkExonggodeoKEBB87q4BM0eCAgadQoxoo8COpUknvlIyoIMWq169XIb3bMaEq2LM7I40ti7Zt2EZ1a826BSuWHFm5c62qJaeVa169e8kxRaCgsOHDhYEADnzt5wkTkCNLNsE2rTWbA+/uLFLTpuYqQxJ0DqkEhAUqoUuMDomCgYEFJnSsHuhkxokUSaLMxqxpN2/fmIHbFB6S+EDj+WjxDo6pufPn0KNLn069eqNAACH5BA0EAAAALAAAAAAwADAAhgAAAB+K0iCJ0CGK0SKL0iGM0iOM0iSN0ySO0ySO1CWO1CWP1COR1SaR1SaQ1iiU1yKQ2iGR3COU3yeV3SeW3imX2RuV6hyW6x2X6x2X7B6Y7B6Y7R+Z7SGT4CKT4CSW4SWX4iiX4SaY4iaY4yeY4yOY5iSZ5ymY4yiZ4yiZ5Cia5SKY6SKY6iCa7SCa7iGb7iKc7iKc7yOd7ymd6ime6iqf7iOd8CSe8CWf8Sqg7Sag8Sag8ieh8iii8iii8ymj8yqk8ymj9Cqk9EDI8ELJ8ULK8UPL8kjW90nW90nX90vc+lDm/1Hn/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf+gACCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXl0JCPz8+PDw6ODg3NzYxMS8vLhwcGhoZFxcWlppCQZ09PDuhpDYyqKotHBuvGBeVtbWdnqCipL+oLqutGbCUycqdn7ujpb+p064Z19iatz653KO+p8GsGuTlmsufod3Q4Kzx8pvaurzegLlosY/fJh+e1AWMVtAgJ2Y6eJXw0GEFjIYGz6XTYQKCgAARWGA0eJDZhwFKhhSQMJLkQx4gCCxZUoRBS5LnRBiYuQRJSxoqUggdSpTEiAM8lzCZxI8GhQUKokqdqiABgqQzJfFTseAI1q9gs0Lil0JB2LNYx8ori7btErVw5di6PQsXm9y5YOsm4+oVb1q9tZwueEC4sOHCX7U2VYGisePHjc3yXKqYJMm7SW5aFiLXSAXNlssqIdLgBGiSMyYscBCixmnUKVTkAPJ6s6batnFv1m2ZN0nfBpHZ3i18+G9MyJMrX868ufPn0BsFAgAh+QQNBAAAACwAAAAAMAAwAIYAAAAfj9whjdMijtUjjtUkjdQlj9QjkdYlktQmkNYmkdcnktYikNomktkmktomk9onld0nlt8pldgpltgsnNsclusdl+sdl+wemOwemO0fme0hk+AilOAnluAol+EnmuUnmeYomeQpm+chmOkkmeglmegmmugmnOogmu0gmu4hm+4inO8jne8pneopnuopnuspn+sqn+wjnfAknvAln/EqoO0poO4qoe84tecmoPEmoPInofIqovAoovIoovMpo/MqpPMpo/QqpPREzfNF0PRG0vVH0/ZI1/hJ2PhK2/lL2/pN4fxP5f5Q5v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/oAAgoOEhYaHiImKi4yNjo+QkZKTlJWWl5dCQj8/Pjs7Ojk0MzMyLCsqKikoGhoYFxcVFZWamkGdnqE0ozOnqKqtGK+ylLW1nJ47OaKkpr+rGhmvFsXGtp09oKKjzqjQrhfV1pq4n9vNK8/B4uObnZ+6zaep0Ozttz7Zuty+qin27Tb5SHau1DwVAAMi03euW8KAAgnuIsFhw4iHEJHBO8EAgYAAGCHiy1ZiQJIiB0JCjGiCwJImR1QKuRGjps2aL16AcNmk56SVQlxEeEC0aFEHDQq87NlE0kogHigMIUK1qlUiTJj6hLSSBwQcWsOK1coVolewY9OSddT1q9q3ZU3ZmnULd2zZgFClXt2bde0joEKNCiZqYOnWuxBp3lwsIoHhn0CBtnDcBIlMyQqUGJFweWUNCBMWdOi8EkaIDzZIRxaiOnJroK9XxoY4O2DtdrfH0VrtGpPv38CDCx9OvLjxRoEAACH5BA0EAAAALAAAAAAwADAAhQAAACKR2iWR2SaS2SaS2iaT2ieW3S2h3S+j3i6j3y+j3zCk3zCl3xuV6hyW6x2X6x2X7B6Y7B6Y7R+Z7SeX4Caa6Cac6iCa7SCa7iGb7iKc7yOd7yWd7Sae7Smd6ime6imf6yOd8CSe8CWf8Sig7ymh7zGm4DKq4Sag8Sag8ieh8iqi8Cqi8Sii8iii8ymj8yqj8imj9Cqk9E/k/lDl/lDm/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAb+QIBwSCwaj8ikcslsOp/QqHRKrU5lstjL1VKlUKORSBTSaDIZzGUiiUAgDkeDisVuXSoVCjwObcxpaxMRbnF0dTIvW11fYWR/Z2kTg24Ph4haLnh6jo+RapNul4iJW3mNYn6AGBiho6SKXF5gYmSAgROvpImaeXu1qmdquruxp7SekcS7mZvInhnLu7ybjX1/0tOxjM8b2dPNvp3f06XVYBzk5ZmMHQHq5dQqFgc0V/HxLCv7JSUkFQlq1JCCbxoMCgUSJiQwQIACgQOhFNwFAsEMiBgzSpyI6MOJjCAhPuHY8WNIkCNJYql48aTIlCoPKpxZgMFLmCpl6NvH04M6CYEEc8YDscBeUKHTVhiAx3EFU45PJ0YtOBVf1XhXy2WdtnVXV1JfEYWtMxaLlbNo06pdy7atWyhBAAAh+QQNBAAAACwAAAAAMAAwAIUAAAAblesclusdl+sdl+wemOwemO0fme0omeApmuAomuEpm+Eqm+EomeQgmu0gmu4hm+4inO8jne8jnfAknvAln/Eqoe4moPEmoPInofIoovIoovMpo/Mpo/QqpPRP5f5Q5v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG/kCAcEgsGo/IpHLJbDqf0Kh0yvR4OJtNJoO5VCqUiSQSgUAejsOhQCAIBIGp1crBarhecHhcfjzUBWwDb1JzVh1YWhkXXhR7ZGZoBwZsboWGdFhbXV+OE5BnaWtsl5hXdlt5nnxnf6OlpohZm6pioJIHsKanipx6tpFpuruyioy/rGfDu1ezeJ0UycvMdRt3vqtk08zFqY2P28y8tNAT4eLVd4vQ5+LNvXnt7unP8u7di/bu71v6++lCQDzZR3COBQUJEAQU2KRgwQYfQEicyHCJQ4IQKU5seNGdhQUMGCx00tFhwIElCfozGSWlypYu3a0sOPMllJgyYeLcVXNfIc+cN3fy1CnU0E9xR5klHRq0qNGlT6lInUq1qtWrWJkEAQAh+QQNBAAAACwAAAAAMAAwAIQAAAAclusdl+sdl+wemOwemO0fme0gmu0gmu4hm+4inO8jne8jnfAknvAln/EmoPEmoPInofIoovIoovMpo/Mpo/QqpPRQ5v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF/iAgjmRpnmiqrmzrvnAMWBQ1RRH0OE7TMAuFIpFAHAwGwmAQaMpmFprtFnnsekAh0YgkKAVOWHRcmeJ0PF92iEAgC0pmQDwe1yYS3FUdHBaPSUpzL3V1ZRNUaD0/WkVugQN0hXY2Z3s/fVtHcJKTUXd5VTt8jVwGnZ4Wh4mXa46nhKmFoDmtmUWoslKIepe3ubo0vLVpmELAwbRVxVnIwauWzM7Bu9GL09R3VFY82NTQxN7Uu6EP4uPg5+PCN+rrd+7rZSMXLOv3Y/T2+Pfx/bH8xvlbN1AgwIDBClJTmPAgQlkMdUWE6PChp4mpMF6saLGQxkkfPXLsmC9klCckC0U+WcmypcuXLkMAACH5BA0EAAAALAAAAAAwADAAhAAAABuV6hyW6x2X6x2X7B6Y7B6Y7R+Z7SCa7SCa7iGb7iKc7yOd7yOd8CSe8CWf8Sag8Sag8ieh8iii8iii8ymj8ymj9Cqk9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX3ICCOZGmeaKqubOu+cHxdVUVNkgRBz+M0jMVCoUggDodCgUAQCAKy2cVio+QiPN8vOCweDcumEyaV1m4SbM+xFRKNSCVhICCXZ2erLssGdhMJSGBMdndTVVd8bX9HSQWFhjQ2OHtafoxxkJFUFHpqllxvSJqRkp6Kl28IpKV5OTtrDqFFrKWcp7GptaWmlKhcu7yuab/BvDSdibnGx2e+fMzHt8oP0ce9xNUv19x4iDrW3NMS4d3O5d2c6N006+zu3fDc8tf0x/a8+KX6kfyG/ncAlhEoheAMgxcQKtzGruFBhg7fQYw4byLFewRjaNzIsaPHjy1CAAAh+QQNBAAAACwAAAAAMAAwAIQAAAAbleoblesclusdl+sdl+wemOwemO0fme0gmu0gmu4hm+4inO8jne8jnfAknvAln/EmoPEmoPInofIoovIoovMpo/Mpo/QqpPQAAAAAAAAAAAAAAAAAAAAAAAAAAAAF+CAgjmRpnmiqrmzrvnCMYZZVUdMUQdDzOA0GY7FQJBAIg6FAGAwCshnmYqvkJLveLzhUKJCHZcEpgEmlNesEy/MBhUQjUjkemM+zNE6X3cKLR0lid3hTVVd9fkNFYEuEhTQ2OGxab4tySY+QaWqUbkFxXwiakDQVnYmWcQmkpXo5ETuffwqtpVSniG2KC7alkTdrqVy+v5ywiUHFv7iouw7Lv8B7idHSzboQ1tLAutvcrzrf3NgT49zT5+hp6ug07e7w6PLc9NL2v/il+pD8hf54AJ4RKIXgDIMYECp84a5hQIYOIy50EVEixIrxCMbYyLGjx48gW4QAACH5BA0EAAAALAAAAAAwADAAhAAAABuV6xyW6x2X6x2X7B6Y7B6Y7R+Z7SCa7SCa7iGb7iKc7yOd7yOd8CSe8CWf8Sag8Sag8ieh8iii8iii8ymj8ymj9Cqk9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX+ICCOZGmeaKqubOu+cAxcVUVJUgQ9j+M0jMVCoUggDoYCgSAQBGSzC812k0B2PqCQaDwcCspBUyaVWqg4HS8bHCYS3uRSECvba5RJbtf7tblHX3MwdnZnFFVXaw5/RYFgBISFd4hpfGxbRXEFkpNleHpWWH6ZXQednmZoe4taXHCoqVKgrH1aQ0WxslOVomu3RLq7h1Vqtm3Cu7yhl6TJysSWrc/KvNJ91NW0vg7Z1dGs3tXLe+Lj4ObjNJXp6njt6mfw6hfz6vbj+NX6yvy7/rIAphLoieAkg4UQ2lFYhqEUh/Ve0JsY0QVFehDrXOyncWNAMh4LQhlJsqTJkycCQwAAIfkEDQQAAAAsAAAAADAAMACEAAAAG5XrHJbrHZfrHZfsHpjsHpjtH5ntIJrtIJruIZvuIpzvI53vI53wJJ7wJZ/xJqDxJqDyJ6HyKKLyKKLzKaPzKaP0KqT0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABesgII5kaZ5oqq5s675wLM/rZVcVNUkR9DwOR4OxWCgUicPBUCAQBIKAzGaz5CgSCcQHHBaPCYSy0IROqTcKlscNesHJA5kwOKMvOF22LSQakWJMBHZ3VmpZPT9BfmBicoR3eDmIfF5/cZCReWtbQH1fgJmReIdsip9goqN5O4melgqqo4acbZayo5Jrrm4MuLmse6cNv7m0lIrFubqtXMrLx1oQz8uku9TVwdjVtNvVkt7fFeHf5NXmy+i56qPske538GjyVPQ29hf4+jHf/e38/gLeAyjQ3z4YBQMefJHQII2HECNKnEixIosQACH5BA0EAAAALAAAAAAwADAAhAAAAByW6x2X6x2X7B6Y7B6Y7R+Z7SCa7SCa7iGb7iKc7yOd7yOd8CSe8CWf8Sag8Sag8ieh8iii8iii8ymj8ymj9Cqk9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXtICCOZGmeaKqubOu+cCzPrGVR0xRF0OM4jQZjoUgkEAeDgUAYCAKBmc1GwUl2PqCQWDwqC80BVDa1VXA6Xnar6CKV4WisPK2me7/gsH1EwJtkdFRoWD56XEZvYIGCVDk7eFoMfEdJBoyNN1ZqeWxFCH6YmWePEQ9re26imZp3a2xGq6x2V6adqbKspK6dRLmsrVeRer/Au4VaxcA3pZHKy7RYDs/LxzzUy6072Nl2E9zZzODhFOPh5tnoy+rA7KzumfCN8oL0dPZl+FP6NvwW/gDnhBvYTyDBcwYPrkuo8J0+GhAjSpxIsaJFFyEAACH5BA0EAAAALAAAAAAwADAAhAAAABuV6xyW6x2X6x2X7B6Y7B6Y7R+Z7SCa7SCa7iGb7iKc7yOd7yOd8CSe8CWf8Sag8Sag8ieh8iii8iii8ymj8ymj9Cqk9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXrICCOZGmeaKqubOu+cCzP7HVVFCVJEfQ8DgdjsVAoEojDoVAgCASBmc1WwU14PqCjMSwmEkomYfCUTW0WnE4C8QW5RCPyYGg6zWcqbtf7vYdySUtNeHk3VjtZf3FHSnWFhmk5fIpwRUeCkIaHFFd9WpZHYJqbkmttoF1ypJs3k1h+W4ysrVWdibGWtK2mlH5wu62cvqDBwranscbCrmufy8y2nj7QzL1s1czDEtna0t3akuDaN+Pk5trozOrC7K3um/CG8nn0Z/ZT+Db6F/z+MeQC1gMosOA/GAUNEkx4Dh+NhxAjSpxIsaKLEAAh+QQNBAAAACwAAAAAMAAwAIQAAAAblesclusdl+sdl+wemOwemO0fme0gmu0gmu4hm+4inO8jne8jnfAknvAln/EmoPEmoPInofIoovIoovMpo/Mpo/QqpPRQ5v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAF8iAgjmRpnmiqrmzrvnAsz+x1VRQlSRH0PA4HY7FQKBKIw6FQIAgEgZnNVsFNeD6gozEsJhJKJmHwlE1tFpxOAvEFuUQj8mBoOs1nKm7X+72HcklLTXh5N1Y7WX9xR0p1hYZpOXyKcEVHgpCGhxRXfVqWR2Cam5JrbaBdcqSbN5NYfluMrK1VnYmxlrStppR+cLutnL6gwcK2p7HGwq5rn8vMtp4+0My9bNXMwxLZ2tLd2pIwGADa5oYV4+Xn7Dbg5+/m8drzzPXC9635m/uG/Xn/zgScMtBdjHbtCl5QyPAgQngOH9IbSKOixYsYM2rc6CIEACH5BA0EAAAALAAAAAAwADAAhAAAABuV6xyW6x2X6x2X7B6Y7B6Y7R+Z7SCa7SCa7iGb7iKc7yOd7yOd8CSe8CWf8Smg7TCm4jKr4yag8Sag8ieh8iii8iii8ymj8yqj8imj9Cqk9E/k/lDm/wAAAAAAAAX+ICCOZGmeaKqubOu+cCzP7LZh11VV1PQ8DgdjsVAoEojDoVAgCASBmc2GwVl4PqCjMSwmEkomYfCUTW0anK4y8QW5RCPyYGg6zWcqbtf7vYdySUtNeHk3VjtZf3FHSnWFhmk5fIpwRUeCkIaHF1d9WpZHYJqbkmttoF1ypJs3k1h+W4ysrVWdibGWtK2mlH5wu62cvqDBwranscbCrmufy8y2nj7QzL1s1czDFTIQ2t96nTAdHRLe4NqSLOTsHRwRGejfGOvt7vDy3+Pl5/nM3f70xQgoEAZBbdnkJUS3EFzDgi8O/hsosdVDhBQrGro40aDGjRk/TuEojKTFkCIQN0hJqZKGy5cwY8qcSbNFCAAh+QQNBAAAACwAAAAAMAAwAIUAAAAoltwqmtsrm9wwpt8blesclusdl+sdl+wemOwemO0fme0omeMgmu0gmu4hm+4inO8jne8jnfAknvAln/EqoO0qoe8yqeEyquEmoPEmoPInofIoovIoovMpo/Mqo/IqpPMpo/QqpPRO4/1Q5v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG/kCAcEgsGo/IpHLJbDqf0Kh0yhSJPJ3OZqPJUCiTSQQCeTwcjcUikUAYDIWp1erBcrhe8EQyLjscamwIB29Sc1YhWFobGV5hfGRmaAsKbW6Gh3RYW11fj2OSaWttmJlXdlt5n5FnapWlpolZnKqQZWeisKanHXederZngLq7souNwH2SxLtXs3iee6zMzXW9qdG21M3GtJ6Q28283sDh4tbH0VIWFSDi58+/UgECDB/v1aidUhcjBPb4iilKJQUDCX8AA5qytqUgiYP/7inMZI2DkocYM2JE6G7iIVkXNYo8OKCCx4UhR2YcUfKkqZQqITLo6HKOQ5kSa9qMYhBhPU6dVvj5BJppXr2fREWsa5e0aJSmu8zplFqTqkurJ7F61DqRq0KvAcHiE/uOrDg5UHdSWcu2rdu3cOMyCQIAIfkEDQQAAAAsAAAAADAAMACFAAAAJY/UJpDVJpDWJ5LWJ5PWKJTXJpPaJ5XdKZfYG5XrHJbrHZfrHZfsHpjsHpjtH5ntJ5bgJ5fhKJfhKJnkKJvmIJrtIJruIZvuIpzvI53vKZzoKZ3pKZ7qKZ7rKp/sI53wJJ7wJZ/xKaDtKqHuKqHvJqDxJqDyJ6HyKqLxKKLyKKLzKaPzKaP0KqT0P8PuRdD0R9P2TN37TeH8T+X+UOb/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABv5AgHBILBqPyKRyyWw6n9CodMp0uVirFQp1MolEoZAmk8FgLhYIxOFoLBaKqdXKwqq4XnAINC5fLmpsDQxvUnNWLVhaKCZeYXxkZmgQD21uhod0WFtdX49jkmlrbZiZV3ZbeZ+RZ2qVpaaJWZyqkGVnorCmpyt3nXq2Z4C6u7KLjcB9ksS7V7N4nnuszM11vanRttTNxrSekLAdFBUlzZqLv4+lHwgJBBMk5rzH0aUcAzIxBvDyzuh5pTYImFFDHz951nx5kfKhYYWBNQruiyevGyMpBzIeCEAwosER/XhtWRKxZEQYKFHSMKkvAsh+CUmanEnTYwEJKULKUlKz53LMFwc8hKTD06dRoEKHupBplGaMmzmVMjWZUiVLAy6VWsGokWPJj1q3Rmn44WFHgxTDBoSINuwce/jauhULZQ47dwfnLo1ySBw5vW/5Aja3bXBhwIf1Jp672G1jtYIH73qslbJUy/2oaN7MubPnz6CdBAEAIfkEDQQAAAAsAAAAADAAMACFAAAAJY7UJY/UJpDVJpDWKJTXJpLZJpPaJ5TbJ5TcJ5XdLZ7cG5XrHJbrHZfrHZfsHpjsHpjtH5ntKJfhJ5rlKJnjKJnkKJrlKZvnIJrtIJruIZvuIpzvI53vKJ3pKZ3pKZ3qKZ7qI53wJJ7wJZ/xKqDtOrrpJqDxJqDyJ6HyKqLwKKLyKKLzKaPzKqPzKaP0KqT0QMXvQcfwSNX3TN37Td/8UOb/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABv5AgHBILBqPyKRyyWw6n9CodMqEwVosViqFOpFIo1GHw9lsNBmJBAJ5NBqMqdXawq64XvBINC5rNGpsDw5vUnNWL1haKSdeYXxkZmgSEW1uhod0WFtdX49jkmlrbZiZV3ZbeZ+RZ2qVpaaJWZyqkGVnorCmpyx3nXq2Z4C6u7KLjcB9ksS7V7N4nnuszM11vanRttQwJRcWH3PGtJ6Q1CoTBAEJGIfW48DUIQcmNAsI7HPWx9HxBzE2Nezhy/fsV79/AAVmsubLixQLECNG9GejYsB7mcQxkhKgo8ePCC0qXLgpxZOKKFOqVHkRgwuSvZysnEkzoAIPsbDIpMkz5XuMARSq7ezZ82fQZkOJzrSJE2lSpShbvnQKpYDVq1hlpGzZbI6UCmDDhjUQkmtXK9RAUEyI8SzaKM3k/TPrFkY/eiPr2oW76xwBAev0euW7q9s3wYOhIEa8bXGmxo4TP4lcFzJly5ExO9a8mDNjz5WpiB5NurTp06ibBAEAIfkEDQQAAAAsAAAAADAAMACGAAAAJY7UJY/UJY/VJpDVJpHXKJTXJ5TbJpXdJ5XdKZbYLZ/cL6PeG5XrHJbrHZfrHZfsHpjsHpjtH5ntJ5fgJ5fhKJfhJ5jiJ5jjJ5jkJ5rlKJjiKJnjKJnkKJvmKZvnIJrtIJruIZvuIpzvI53vKZzoKZ3pKZ3qKJ/uI53wJJ7wJZ/xKaDtKaDuKqHuKqHvMabgJqDxJqDyJ6HyKqLxKKLyKKLzKaPzKqPyKqTzKaP0KqT0PsDtPsLtTN77TuH9UOb/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/6AAIKDhIWGh4iJiouMjY6PkJGSk4w7Ozc2NjMzMjErKyoqJCMjIiIhIBMTEREQDg4Nk5aWN5g1nJ6gKimjpSEhqqwQD6+Ss5Y6mJozMZ6hvKSmqBMSra7Gx7SYm52fz6PSqaut2NmXtpu539GnqtXl5smZ3OrQpafi8ObnNrfduvZOAdO3T96yZgB7SSO479I8XN52sWPYsFa/dBHtUTSXw0QGDSiW/ds1amO2DwcCFKjAQqS6XSZn5dig4AcPAiwfvoxpCYeFBUCA9CCwoaXLTzx3+AQadGhRdN2MnehAtapVqj+DNiXaQlk6SSUSCAhAtqxZsky1OmVhcZMkDqYGfGidS7euUJxsbUnKarcv3R4DLuCQtzet38MwELCgVfiwYyCJF1tq/LgvYAw4Zr2NW7nuUJbHwCYgYKC06dOlGfwlKllzpB1TOcieTZsDBcNOXZhLSoPv3Q26d79ueGzpVuANk86seRN58uHEZ6FU6fw5pOjHOnbw8AJ7UuzCr4MfHxo6+fHfz+9If549effozauPDh+8rPn0Kenfz7+///8ANhIIACH5BA0EAAAALAAAAAAwADAAhgAAACOM0iON1COO1SSO1CWO1CWP1CSO1SWQ1CaQ1SaR1yeS1ieT1iiT1yiU1yWS2ieU2yeV3SSU3iWV3iSU3yWV3yqZ2S2e3BuV6xyW6x2X6x2X7B6Y7B6Y7R+Z7SeW4CWX4iWX5CiX4SeY4iaa5yiY4iiZ4yiZ5Cib5iib5yad6yCa7SCa7iGb7iKc7yOd7yad7Cmc6Cmd6Smd6iOd8CSe8CWf8Smg7Sqh7jGp4DKp4Sag8Sag8ieh8iii8iii8ymj8yqj8iqk8ymj9Cqk9D3A7D7A7T7C7Uvc+k3g/FDm/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf+gACCg4SFhoeIiYqLjI2Oj5CRkpOMRERAPz89PTw7NjY1NS8uLi0tLCseHhwcGxkZGJOWlkCYPpyeoDU0o6UsLKqsGxqvkrOWQ5iaPTueobykpqgeHa2uxse0mJudn8+j0qmrrdjZl7abud/Rp6rV5ebJmdzq0KWn4vDm5z+33br2TgHTt0/esmYAe0kjuO/SPFzedrFj2LBWv3QR7VFsKM8HCRAhVHiDtrHhpRQPAgygIBJgyYZCRjBIUkRAhZahXu4TUsKCEiVHbMLIpdMcT58/jxCoMNQGwRknokqdGrXnz6QHbu7QJyOCgQJgw4oFi/TqkQMSVOgzsQDJ1bebcOMCFTAB3lG5eOMGtWs1r9+fOfiW/YtXh2DCeY8YWNsWsV4DH7hGQOCgsuXLlS/APZLgw42nJ0yIHk3ahIjBnEXcIFI0W5C+QBOIwGGp9bG7sWfPsj1LiIkGSYzIpr07ksnjMSAUUKD7GO/eMk6gIO7c+PHrDZ9jZ219u3fukL5/146d/HXzx9GbVJ+dfTZK8OPLn0+/vn1HgQAAIfkEDQQAAAAsAAAAADAAMACGAAAAIYrRIYzVIo7VIo3WJY7UIo/YJpDVJZHXJpHXKJTXJpLYJpLZJJLbJpPaJZPcJpTcJ5TcJpTdJ5XdJ5beL6beL6bfMKffG5XrHJbrHZfrHZfsHpjsHpjtH5ntIpPgI5ThI5XhJJXhJJbjI5bkJ5nkKJnjKJnkKJrlKJvmKZvnIJrtIJruIZvuI5zuIpzvI53vJJztJp7tKZzoKJ7sKZ/sKJ/tKp/sI53wJJ7wJZ/xKqDtKqHuMabgMajgMqnhMqrhN7TmN7XmOLXnObjoJqDxJ6HxJqDyJ6HyKqLwKqLxKKLyKKLzKaPzKqPyKqTzKaP0KqT0TuL9T+T+T+X+UOb/Ueb/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/6AAIKDhIWGh4iJiouMjY6PkJGSk4xRUU1MTEhIR0U6Ojk5MC8vLS0sKx4eHBwbGRkYk5aWTZhLnJ6gOTijpSwsqqwbGq+Ss5ZQmJpIRZ6hvKSmqB4dra7Gx7SYm52fz6PSqaut2NmXtpu539GnqtXl5smZ3OrQpafi8ObnTLfduvZOAdO3T96yZgB7SSO479I8XN52sWPYsFa/dBHtUWxokJuMESFIuBi1sSE/JEZEDAhgAEQMHCVNWrTRwIcUCwQ+xIhp8hKNB0GqTLkgAATPnjUgBBVaQcBGJSpOSJ1KVaoEIVWyTqlA8QkKBgXCih0rdkhWrRR5UOhB5azbt5Nwq0RquGOC2bh430Kiazev36xWHvG9+xdvYEeDC+fdu08tW8Vw5+7zyuCAgsuYM18m4nbK06gmQosebSIC4Sk+jpq80VeoDwSqE0/5gaBE7MYTgEj5saCEktvmnphIUMABCiVRgJtLkuLEDCeWlPeMLnm69WzSp2fvud1k94bf94U3Nx57eeqU0qtfz769+/eMAgEAIfkEDQQAAAAsAAAAADAAMAAAB/6AAIKDhIWGh4iJiouMjY6PkJGSk4w7Ozk4ODY2NTQyMjExLCsrKiopKBkZFxcWFBQTk5aWOZg3nJ6gMTCjpSkpqqwWFa+Ss5Y6mJo2NJ6hvKSmqBkYra7Gx7SYm52fz6PSqaut2NmXtpu539GnqtXl5smZ3OrQpafi8ObnOLfduvZOAdO3T96yZgB7SSO479I8XN52sWPYsFa/dBHtUWxokJ6MEBo2nFixsSE/biIeBBgAwURJkxY1cRAQhAcBCC9NOsTBoYAQIT4M5NRZy8OBn0BfuihBoqnTpyA+IEAqZEgknS4kLFDAtatXrgmo/oSks8QCIGLTqh3rSCcJBX5r44pta/Kt3LtC6Da0izeu3n18+6r9a84sWsFzCWfLusCB48eQH6cli7XEiMuYM1+Gi9QqZZ2gdwT+MRQ03x8MSrtVEKQHgw6qTbaIsKBBhxexZZMoMWNH7tC+rwIfbul3aOOgketUbpJ5Q+f7oJuTRfw4pevYs2vfzr17o0AAIfkEDQQAAAAsAAAAADAAMAAAB/6AAIKDhIWGh4iJiouMjY6PkJGSk4w7Ozk4ODY2NTQyMjExLCsrKiopKBkZFxcWFBQTk5aWOZg3nJ6gMTCjpSkpqqwWFa+Ss5Y6mJo2NJ6hvKSmqBkYra7Gx7SYm52fz6PSqaut2NmXtpu539GnqtXl5smZ3OrQpafi8ObnOLfduvZOAdO3T96yZgB7SSO479I8XN52sWPYsFa/dBHtUWxokJ6MEBo2nFixsSE/biIeBBgAwURJkxY1cRAQhAcBCC9NOsTBoYAQIT4M5NRZy8OBn0BfuihBoqnTpyA+IEAqZEgknS4kLFDAtatXrgmo/oSks8QCIGLTqh3rSCcJBX5r44pta/Kt3LtC6Da0izeu3n18+6r9a84sWsFzCWfLusCB48eQH6cli7XEiMuYM1+Gi9QqZZ2gdwT+MRQ03x8MSrtVEKQHgw6qTbaIsKBBhxexZZMoMWNH7tC+rwIfbul3aOOgketUbpJ5Q+f7oJuTRfw4pevYs2vfzr17o0AAIfkEDQQAAAAsAAAAADAAMAAAB/6AAIKDhIWGh4iJiouMjY6PkJGSk4w7Ozk4ODY2NTQyMjExLCsrKiopKBkZFxcWFBQTk5aWOZg3nJ6gMTCjpSkpqqwWFa+Ss5Y6mJo2NJ6hvKSmqBkYra7Gx7SYm52fz6PSqaut2NmXtpu539GnqtXl5smZ3OrQpafi8ObnOLfduvZOAdO3T96yZgB7SSO479I8XN52sWPYsFa/dBHtUWxokJ6MEBo2nFixsSE/biIeBBgAwURJkxY1cRAQhAcBCC9NOsTBoYAQIT4M5NRZy8OBn0BfuihBoqnTpyA+IEAqZEgknS4kLFDAtatXrgmo/oSks8QCIGLTqh3rSCcJBX5r44pta/Kt3LtC6Da0izeu3n18+6r9a84sWsFzCWfLusCB48eQH6cli7XEiMuYM1+Gi9QqZZ2gdwT+MRQ03x8MSrtVEKQHgw6qTbaIsKBBhxexZZMoMWNH7tC+rwIfbul3aOOgketUbpJ5Q+f7oJuTRfw4pevYs2vfzr17o0AAIfkEDQQAAAAsAAAAADAAMAAAB/6AAIKDhIWGh4iJiouMjY6PkJGSk4w7Ozk4ODY2NTQyMjExLCsrKiopKBkZFxcWFBQTk5aWOZg3nJ6gMTCjpSkpqqwWFa+Ss5Y6mJo2NJ6hvKSmqBkYra7Gx7SYm52fz6PSqaut2NmXtpu539GnqtXl5smZ3OrQpafi8ObnOLfduvZOAdO3T96yZgB7SSO479I8XN52sWPYsFa/dBHtUWxokJ6MEBo2nFixsSE/biIeBBgAwURJkxY1cRAQhAcBCC9NOsTBoYAQIT4M5NRZy8OBn0BfuihBoqnTpyA+IEAqZEgknS4kLFDAtatXrgmo/oSks8QCIGLTqh3rSCcJBX5r44pta/Kt3LtC6Da0izeu3n18+6r9a84sWsFzCWfLusCB48eQH6cli7XEiMuYM1+Gi9QqZZ2gdwT+MRQ03x8MSrtVEKQHgw6qTbaIsKBBhxexZZMoMWNH7tC+rwIfbul3aOOgketUbpJ5Q+f7oJuTRfw4pevYs2vfzr17o0AAOw=='
        },
      }
    ]});
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
