"use strict";

import Config from "../config.js";
import { DB, Guild } from "../db.js";
import { ActivityType, Events, userMention, roleMention, channelMention } from "discord.js";

export default {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(client, oldState, newState) {
    if (oldState.member.user.bot) { return; } //check if is bot

    let _guild = await Guild.findOne({ guild_id: Config.discord.guild_id });

    let message = null;
    let color = null; 
    if (newState.channelId === null) {
      message = `${userMention(oldState.member.user.id)} left ${channelMention(oldState.channelId)}`;
      color = 0xFF6961;
    } else if (oldState.channelId === null) {
      message = `${userMention(oldState.member.user.id)} joined ${channelMention(newState.channelId)}`;
      color = 0x77DD77;
    } else if(newState.channelId !== oldState.channelId) {
      message = `${userMention(oldState.member.user.id)} moved from ${channelMention(oldState.channelId)} to ${channelMention(newState.channelId)}`;
      color = 0xFFB347;
    }
    if(message && color) {
      client.channels.cache.get(_guild.guild_logs).send({embeds: [
        {
          color: color,
          description: message,
          author: {
            name: 'Voice State Update',
            icon_url: 'https://i.imgur.com/w58gdx3.png'
          },
        }
      ]});
    }
  },
};
