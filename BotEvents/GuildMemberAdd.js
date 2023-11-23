"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(client, member) {
    let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });
    //send message to welcome chan
    client.channels.cache.get(_guild.guild_welcome).send({ 
      embeds: [{
        color: 0xFDFD96,
        description: `Hey ${userMention(member.id)}.\nWelcome to **The Old Republic**!\n\n` 
        +"Thank you for picking **TOR** for your foxhole experience.\n"
        +`Message an ${roleMention('1099256574855360512')} or ${roleMention('549158076897427498')}\n`
        +"If you're here for other games, let us know so we can give you the correct roles.\n\n"
        +"⬇️For Foxhole players only⬇️\n"
        +"Provide us the following and we'll get you sorted.\n"
        +`1. DM an ${roleMention('1099256574855360512')} or ${roleMention('549158076897427498')} a screenshot of your F1 in game to be verified.\n`
        +`2. If possible, hop in a Voice chat with an ${roleMention('1099256574855360512')} or ${roleMention('549158076897427498')} for a quick briefing and introduction to the clan and game.\n`
        +"3. If you are from Another clan, please tell us which clan and what position you have in the clan so we can give the proper role for you.\n"
        +"4. Please change up your discord name to be the same as your in-game name (nickname).\n"
        +"5. TELL US YOUR TIMEZONE.\n\n"
        +"**NOTE:** BECAUSE OF OF OUR TIMEZONES WE ARE MOSTLY GREETING AND SETTING PEOPLE UP FROM 8am CST TO 10pm CST. IF YOU JOIN OUTSIDE THESE TIMES YOU WILL HAVE TO WAIT UNTIL THE PROPER  TIME UNLESS AN EU PLAYER IS UP AND ABOUT."
      }]
    });
    
    //admin logging
    client.channels.cache.get(Config.discord.channel_id).send(`GuildMemberAdd: ${userMention(member.id)} joined the server.`);
  },
};
