/**
 * @name events/InteractionCreate.ts
 * @version 2026-02-04
 * @summary Handles interaction events (slash commands, buttons, etc.)
 **/
"use strict"

import util from "node:util"

import type { Interaction } from "discord.js"
import { Events } from "discord.js"
import type { DiscordBot, DiscordEvent } from "../types"
import Config from "../config"
// import { Databank } from "../databank"

import DiscordCommands from "../commands"

/**
 * Message create event handler
 */
const ev: DiscordEvent = {
  name: Events.InteractionCreate,
  once: false,
  execute: async (client: DiscordBot, interaction: Interaction) => {
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isChannelSelectMenu() &&
      !interaction.isRoleSelectMenu() &&
      !interaction.isModalSubmit() &&
      !interaction.isAutocomplete()
    ) {
      return
    }

    const commandName: string =
      interaction.isChatInputCommand() || interaction.isAutocomplete()
        ? interaction.commandName
        : interaction.customId.split("_")[0]

    if (!Object.keys(DiscordCommands).includes(commandName)) {
      console.log(`COMMANDS: ${util.inspect(DiscordCommands, true, null, true)}`)

      console.error(`No command matching ${commandName} was found.`)
    } else {
      try {
        await DiscordCommands[commandName].execute(client, interaction)
      } catch (err) {
        console.error(`[ERROR]: ${err}`)
        // await client.channels.cache
        //   .get(_guild.guild_logs)
        //   ?.send(`There was an error while executing this command!\n${err.code}: ${err.message}`)
      }
    }

    // Handle command interactions
    if (Config.debug) console.log(`Command used: ${commandName}`)
  }
}

export default ev
