/**
 * @name setup.ts
 * @version 2026-02-03
 * @summary Setup Commands
 **/

import type { Client, Interaction } from "discord.js"
import {
  ChannelType,
  InteractionContextType,
  PermissionFlagsBits,
  MessageFlags,
  SlashCommandBuilder,
  channelMention
} from "discord.js"

import type { DiscordCommand } from "../types"
import { DiscordGuild } from "../databank"

const commandSetup: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure bot.")
    .setContexts([InteractionContextType.Guild])
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand((subcommand) =>
      subcommand
        .setName("logs")
        .setDescription("Set the logs channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to post to.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stockpiles")
        .setDescription("Set the stockpiles channel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to post to.")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("welcome")
        .setDescription("Set the welcome message.")
        .addStringOption(
          (option) =>
            option.setName("message").setDescription("The message to set.").setRequired(true).setMaxLength(2000) //ensure the text will fit in an embed description
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("color")
        .setDescription("Set the message color.")
        .addStringOption((option) =>
          option.setName("color").setDescription("The color to set.").setRequired(true).setMinLength(6).setMaxLength(6)
        )
    ),

  async execute(client: Client, interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return

    const _subcommand = interaction.options.getSubcommand()

    switch (_subcommand) {
      case "logs":
        let _logschannel = interaction.options.getChannel("channel")
        if (_logschannel) {
          await DiscordGuild.updateOne({ id: interaction.guildId }, { $set: { logsChannelId: _logschannel.id } })
          interaction.reply({
            content: `Set ${channelMention(_logschannel.id)} as the logs channel.`,
            ephemeral: true
          })
        }
        break

      case "stockpiles":
        let _stockpileschannel = interaction.options.getChannel("channel")
        if (_stockpileschannel) {
          await DiscordGuild.updateOne(
            { id: interaction.guildId },
            { $set: { stockpilesChannelId: _stockpileschannel.id } }
          )
          interaction.reply({
            content: `Set ${channelMention(_stockpileschannel.id)} as the stockpiles channel.`,
            ephemeral: true
          })
        }
        break

      case "welcome":
        let _message = interaction.options.getString("message")
        if (_message) {
          await DiscordGuild.updateOne({ id: interaction.guildId }, { $set: { welcomeMessage: _message } })
          interaction.reply({
            content: "Set guild welcome message.",
            ephemeral: true
          })
        }
        break

      case "color":
        let _color = interaction.options.getString("color")
        if (_color) {
          await DiscordGuild.updateOne({ id: interaction.guildId }, { $set: { embedColor: parseInt(_color, 16) } })
          interaction.reply({
            content: "Set guild message color.",
            ephemeral: true
          })
        }
        break

      default:
        const m = `Unknown subcommand '${_subcommand}'`
        console.warn(m)
        await interaction.reply({ content: m, flags: MessageFlags.Ephemeral })
        break
    }
  }
}

export default commandSetup
