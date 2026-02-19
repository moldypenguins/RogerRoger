/**
 * @name rolereaction.ts
 * @version 2026-02-03
 * @summary Role reaction commands
 **/

import {
  ContainerBuilder,
  SlashCommandBuilder,
  //
  GuildMemberRoleManager,
  Interaction,
  LabelBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  Channel,
  InteractionContextType,
  EmbedBuilder,
  Message,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  roleMention,
  MessageFlags,
  TextBasedChannel,
  UserSelectMenuBuilder
} from "discord.js"

import type { DiscordBot, DiscordCommand, DiscordGuildData } from "../types/index.js"
import { DiscordGuild } from "../databank/index.js"

const commandRoleReaction: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName("rolereaction")
    .setDescription("Create a new role reaction message.")
    .setContexts([InteractionContextType.Guild])
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option.setName("title").setDescription("The role reaction title.").setRequired(true).setMaxLength(255))
    .addStringOption((option) => option.setName("description").setDescription("The role reaction description.").setRequired(true).setMaxLength(2000))
    .addStringOption((option) => option.setName("color").setDescription("The role reaction color hex.").setRequired(false).setMinLength(6).setMaxLength(6)),
  async execute(client: DiscordBot, interaction: Interaction): Promise<void> {
    let _guild = (await DiscordGuild.findOne({ id: interaction.guildId })) as DiscordGuildData

    const _chan = interaction.channel as TextBasedChannel
    const _channel = client.channels.cache.get(_chan.id) as Channel

    if (interaction.isChatInputCommand()) {
      let _title = interaction.options.getString("title") as string
      let _description = interaction.options.getString("description") as string
      let _color = interaction.options.getString("color") as string

      const post = new ButtonBuilder().setCustomId("rolereaction_post").setLabel("Post").setStyle(ButtonStyle.Primary)
      const cancel = new ButtonBuilder().setCustomId("rolereaction_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)

      const container = new ContainerBuilder()
        .setAccentColor(parseInt(_color, 16))
        .addTextDisplayComponents(
          (textDisplay) => textDisplay.setContent(`#${_title}`),
          (textDisplay) => textDisplay.setContent(`${_description.replace(/\\n/g, "\n")}`)
        )
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent("And you can place one button or one thumbnail component next to it!"))
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(new RoleSelectMenuBuilder().setCustomId("rolereaction_role").setPlaceholder("Role").setMinValues(1).setMaxValues(1))
        )

      await interaction.reply({
        components: [container, new ActionRowBuilder<ButtonBuilder>({ components: [post, cancel] })],
        flags: MessageFlags.IsComponentsV2
      })
    } else if (interaction.isButton()) {
      let _command = interaction.customId.split("_")[1]
      if (_command == "post") {
        if (!_channel.isTextBased()) return
        await _channel.messages
          .fetch(interaction.message.id)
          .then((message: Message) => {
            let _channel = new ChannelSelectMenuBuilder().setCustomId("rolereaction_channel").setPlaceholder("Channel").setMinValues(1).setMaxValues(1)
            let _cancel = new ButtonBuilder().setCustomId("rolereaction_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
            message.edit({
              components: [
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(_channel),
                new ActionRowBuilder<ButtonBuilder>().addComponents(_cancel)
              ]
            })
            interaction.deferUpdate()
          })
          .catch((err) => {
            console.log(`Error: ${err}`)
          })
      } else if (_command == "cancel") {
        if (!_channel.isTextBased()) return
        await _channel.messages
          .fetch(interaction.message.id)
          .then((message: Message) => message.delete())
          .catch((err) => {
            console.log(`Error: ${err}`)
          })
      } else if (_command == "react") {
        if (!interaction.member) return

        let _role = interaction.customId.split("_")[2]

        const _roles = interaction.member.roles as GuildMemberRoleManager

        if (_roles.cache.has(_role)) {
          await _roles.remove(_role)
        } else {
          await _roles.add(_role)
        }
        await interaction.reply({
          embeds: [
            {
              color: _guild.embedColor,
              title: `Role ${_roles.cache.has(_role) ? "Added" : "Removed"}`,
              description: roleMention(_role),
              fields: []
            }
          ],
          ephemeral: true
        })
      }
    } else if (interaction.isRoleSelectMenu()) {
      let _command = interaction.customId.split("_")[1]

      if (_command == "role") {
        let _role = interaction.values[0]

        const modal = new ModalBuilder().setCustomId(`rolereaction_add_${interaction.message.id}_${_role}`).setTitle("Add Emoji")

        const emojiInput = new TextInputBuilder().setCustomId("emoji").setLabel("Emoji").setRequired(true).setStyle(TextInputStyle.Short)

        const descriptionInput = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setRequired(false)
          .setMaxLength(255)
          .setStyle(TextInputStyle.Short)

        modal.components.push(new ActionRowBuilder<TextInputBuilder>().addComponents(emojiInput))
        modal.components.push(new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput))

        await interaction.showModal(modal)
      }
    } else if (interaction.isChannelSelectMenu()) {
      let _command = interaction.customId.split("_")[1]

      if (_command == "channel") {
        const _postchan = client.channels.cache.get(interaction.values[0])
        if (!_postchan || !_postchan.isTextBased() || !_postchan.isSendable()) return

        let _components = new ActionRowBuilder<ButtonBuilder>()
        for (let _id in interaction.message.embeds[0].fields) {
          let _values = interaction.message.embeds[0].fields[_id].value.split(": ")

          if (_values[1].includes("\n")) {
            let _vals = _values[1].split("\n")
            _values[1] = _vals[0]
            _values[2] = _vals[1]
          }

          const _text = _values[1].match(/^<@&(\d+)>$/)
          if (!_text) return

          _components.addComponents(new ButtonBuilder().setCustomId(`rolereaction_react_${_text[1]}`).setEmoji(_values[0]).setStyle(ButtonStyle.Secondary))
        }

        interaction.message.embeds[0].fields.unshift({
          name: "",
          value: "\u200b",
          inline: false
        })
        interaction.message.embeds[0].fields.push({
          name: "",
          value: "\u200b",
          inline: false
        })

        _postchan.send({
          embeds: [
            {
              color: interaction.message.embeds[0].color ?? undefined,
              title: interaction.message.embeds[0].title ?? undefined,
              description: interaction.message.embeds[0].description ?? undefined,
              fields: interaction.message.embeds[0].fields
            }
          ],
          components: [_components]
        })

        if (!_channel.isTextBased()) return
        await _channel.messages
          .fetch(interaction.message.id)
          .then((message: Message) => message.delete())
          .catch((err) => {
            console.log(`Error: ${err}`)
          })

        interaction.deferUpdate()
        //TODO: add to databank and send confirmation in ephemeral
      }
    } else if (interaction.isModalSubmit()) {
      let _command = interaction.customId.split("_")[1]

      if (_command == "add") {
        let _message = interaction.customId.split("_")[2]
        let _role = interaction.customId.split("_")[3]
        let _emoji = interaction.fields.getTextInputValue("emoji")
        let _description = interaction.fields.getTextInputValue("description")

        try {
          if (!_channel.isTextBased()) return
          await _channel.messages.fetch(_message).then((message: Message) => {
            let _embed = EmbedBuilder.from(message.embeds[0]).data
            if (!_embed.fields) {
              _embed.fields = []
            }
            _embed.fields.push({
              name: "",
              value: `${_emoji}: ${roleMention(_role)}` + (_description ? `\n${_description}` : "") + "\n",
              inline: false
            })

            message.edit({
              embeds: [_embed]
            })

            interaction.deferUpdate()
            return
          })
        } catch (err) {
          console.log(`Error: ${err}`)
        }
      }
    }
  }
}

export default commandRoleReaction
