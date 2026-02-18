/**
 * @name rolereaction.ts
 * @version 2026-02-03
 * @summary Role reaction commands
 **/

import type { Client, Interaction } from "discord.js"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  InteractionContextType,
  EmbedBuilder,
  Message,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  roleMention
} from "discord.js"

import type { DiscordCommand, DiscordGuildData } from "../types"
import { DiscordGuild } from "../databank"

const commandRoleReaction: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName("rolereaction")
    .setDescription("Create a new role reaction message.")
    .setContexts([InteractionContextType.Guild])
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addStringOption((option) =>
      option.setName("title").setDescription("The role reaction title.").setRequired(true).setMaxLength(255)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("The role reaction description.")
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("The role reaction color.")
        .setRequired(false)
        .setMinLength(6)
        .setMaxLength(6)
    ),

  async execute(client, interaction) {
    //console.log(`INT: ${util.inspect(interaction, true, 2, true)}`);
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: interaction.guildId })
    if (!_guild) return

    if (interaction.isChatInputCommand()) {
      let _title = interaction.options.getString("title")
      let _description = interaction.options.getString("description")
      let _color = interaction.options.getString("color")

      const role = new RoleSelectMenuBuilder()
        .setCustomId("rolereaction_role")
        .setPlaceholder("Role")
        .setMinValues(1)
        .setMaxValues(1)

      const post = new ButtonBuilder().setCustomId("rolereaction_post").setLabel("Post").setStyle(ButtonStyle.Primary)

      const cancel = new ButtonBuilder()
        .setCustomId("rolereaction_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)

      await interaction.reply({
        embeds: [
          {
            color: parseInt(_color, 16),
            title: _title,
            description: _description.replace(/\\n/g, "\n"),
            fields: []
          }
        ],
        components: [new ActionRowBuilder().addComponents(role), new ActionRowBuilder().addComponents(post, cancel)],
        ephemeral: false
      })
    } else if (interaction.isButton()) {
      let _command = interaction.customId.split("_")[1]

      if (_command == "post") {
        try {
          await client.channels.cache
            .get(interaction.channel.id)
            .messages.fetch(interaction.message.id)
            .then((message: Message) => {
              let _channel = new ChannelSelectMenuBuilder()
                .setCustomId("rolereaction_channel")
                .setPlaceholder("Channel")
                .setMinValues(1)
                .setMaxValues(1)

              let _cancel = new ButtonBuilder()
                .setCustomId("rolereaction_cancel")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)

              message.edit({
                components: [
                  new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(_channel),
                  new ActionRowBuilder<ButtonBuilder>().addComponents(_cancel)
                ]
              })

              return interaction.deferUpdate()
            })
        } catch (err) {
          console.log(`Error: ${err}`)
        }
      } else if (_command == "cancel") {
        try {
          await client.channels.cache
            .get(interaction.message.channelId)
            .messages.fetch(interaction.message.id)
            .then((message: Message) => message.delete())
        } catch (err) {
          console.log(`Error: ${err}`)
        }
      } else if (_command == "react") {
        let _role = interaction.customId.split("_")[2]
        //console.log(`CID: ${util.inspect(interaction.member._roles, true, 0, true)}`);
        let _added = null
        if (interaction.member.roles.cache.has(_role)) {
          await interaction.member.roles.remove(_role)
          _added = false
        } else {
          await interaction.member.roles.add(_role)
          _added = true
        }
        await interaction.reply({
          embeds: [
            {
              color: _guild.embedColor,
              title: `Role ${_added ? "Added" : "Removed"}`,
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

        const modal = new ModalBuilder()
          .setCustomId(`rolereaction_add_${interaction.message.id}_${_role}`)
          .setTitle("Add Emoji")

        const emojiInput = new TextInputBuilder()
          .setCustomId("emoji")
          .setLabel("Emoji")
          .setRequired(true)
          .setStyle(TextInputStyle.Short)

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
        let _channel = interaction.values[0]

        let _components = new ActionRowBuilder()
        for (let _id in interaction.message.embeds[0].fields) {
          let _values = interaction.message.embeds[0].fields[_id].value.split(": ")

          if (_values[1].includes("\n")) {
            let _vals = _values[1].split("\n")
            _values[1] = _vals[0]
            _values[2] = _vals[1]
          }

          _components.addComponents(
            new ButtonBuilder()
              .setCustomId(`rolereaction_react_${_values[1].match(/^<@&(\d+)>$/)[1]}`)
              .setEmoji(_values[0])
              .setStyle(ButtonStyle.Secondary)
          )
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

        client.channels.cache.get(_channel).send({
          embeds: [
            {
              color: interaction.message.embeds[0].color,
              title: interaction.message.embeds[0].title,
              description: interaction.message.embeds[0].description,
              fields: interaction.message.embeds[0].fields
            }
          ],
          components: [_components]
        })

        try {
          await client.channels.cache
            .get(interaction.message.channelId)
            .messages.fetch(interaction.message.id)
            .then((message: Message) => message.delete())
        } catch (err) {
          console.log(`Error: ${err}`)
        }

        return interaction.deferUpdate()
      }
    } else if (interaction.isModalSubmit()) {
      let _command = interaction.customId.split("_")[1]

      if (_command == "add") {
        let _message = interaction.customId.split("_")[2]
        let _role = interaction.customId.split("_")[3]
        let _emoji = interaction.fields.getTextInputValue("emoji")
        let _description = interaction.fields.getTextInputValue("description")

        try {
          await client.channels.cache
            .get(interaction.channel.id)
            .messages.fetch(_message)
            .then((message: Message) => {
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

              return interaction.deferUpdate()
            })
        } catch (err) {
          console.log(`Error: ${err}`)
        }
      }
    }
  }
}

export default commandRoleReaction
