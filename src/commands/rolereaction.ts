/**
 * @file commands/rolereaction.ts
 * @description Role reaction commands for creating interactive role assignment messages
 * @version 2026-02-19
 */

import util from "node:util"

import {
  APISelectMenuOption,
  APIRole,
  ModalBuilder,
  ContainerBuilder,
  ContainerComponent,
  SlashCommandBuilder,
  SeparatorSpacingSize,
  ActionRow,
  MessageActionRowComponent,
  Guild,
  GuildMemberRoleManager,
  GuildEmoji,
  Role,
  Interaction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  Channel,
  InteractionContextType,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  roleMention,
  MessageFlags,
  TextBasedChannel,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder,
  ComponentType,
  TextDisplayComponent,
  SectionComponent,
  LabelBuilder,
  ButtonComponent,
  RoleSelectMenuComponent,
  StringSelectMenuComponent,
  ChannelType
} from "discord.js"

import type { DiscordBot, DiscordCommand, DiscordGuildData, RoleReactionMessageData, RoleReactionData } from "../types/index.js"
import { Databank, DiscordGuild, RoleReaction } from "../databank/index.js"
import { isSnowflake } from "../utils.js"

const IDS = {
  LOADING: 412565817,
  CONTAINER: 555798250,
  ROLEREACTIONS: 303777619,
  SECTION: 933374421,
  DETAILS: 897811392
}

const EMOJISPERPAGE = 24

const createLoading = (color: number, title: string, description: string) => {
  return new ContainerBuilder()
    .setId(IDS.LOADING)
    .setAccentColor(color)
    .addTextDisplayComponents(
      (textDisplay) => textDisplay.setContent(`# ${title}`),
      (textDisplay) => textDisplay.setContent(`***${description.replace(/\\n/g, "\n")}***`)
    )
    .addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Loading..."))
}

/**
 * Creates a container UI component for role reaction setup with emoji pagination
 */
const createComponent = async (interaction: Interaction, document: RoleReactionMessageData, page: string = "0") => {
  if (!interaction.guild || !interaction.channel) throw new Error("Command must be used in a guild channel.")

  const pagenum = parseInt(page, 10)
  const emojis = Array.from(interaction.guild.emojis.cache.values())
  const _reaction: RoleReactionData = document.reactions.find((r) => r.published === false) as RoleReactionData

  const _container = new ContainerBuilder()
    .setId(IDS.CONTAINER)
    .setAccentColor(document.color)
    .addTextDisplayComponents(
      (textDisplay) => textDisplay.setContent(`# ${document.title}`),
      (textDisplay) => textDisplay.setContent(`***${document.description.replace(/\\n/g, "\n")}***`)
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Role Reactions:").setId(IDS.ROLEREACTIONS))

  const _published: RoleReactionData[] = document.reactions.filter((m) => m.published === true)
  if (_published.length > 0) {
    for (const reaction of _published) {
      const emoji = emojis.find((e) => e.id === reaction.emojiId) as GuildEmoji
      const details = reaction.details.length > 0 ? `\n  - ${reaction.details}` : ""
      _container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`- ${emoji} <@&${reaction.roleId}>${details}`))
    }
  }

  if (!isSnowflake(document.postId)) {
    const totalPages = Math.ceil(emojis.length / EMOJISPERPAGE)
    const start = pagenum * EMOJISPERPAGE
    const currentEmojis = emojis.slice(start, start + EMOJISPERPAGE)

    const emojiSelect = new StringSelectMenuBuilder()
      .setCustomId(`rolereaction_selectemoji_${document.editId}_${pagenum}`)
      .setPlaceholder("Select emoji")
      .addOptions(
        currentEmojis.map((emoji: GuildEmoji) => {
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${emoji.name}`)
            .setValue(emoji.id)
            .setEmoji(emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`)
            .setDefault(_reaction.emojiId.length > 0 && _reaction.emojiId === emoji.id)
        })
      )

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(`rolereaction_selectrole_${document.editId}_${pagenum}`)
      .setPlaceholder("Select role")
      .setRequired()
      .setMinValues(1)
      .setMaxValues(1)

    if (isSnowflake(_reaction.roleId)) {
      roleSelect.setDefaultRoles([_reaction.roleId])
    }

    const channelSelect = new ChannelSelectMenuBuilder()
      .setChannelTypes(ChannelType.GuildText)
      .setCustomId(`rolereaction_selectchannel_${document.editId}_${pagenum}`)
      .setPlaceholder("Select channel")
      .setRequired()
      .setMinValues(1)
      .setMaxValues(1)

    if (isSnowflake(document.channelId)) {
      channelSelect.setDefaultChannels([document.channelId])
    }

    _container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Channel:"))
      .addActionRowComponents((actionRow) => actionRow.setComponents(channelSelect))
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Emoji:"))

    const emojiButtons = [
      new ButtonBuilder()
        .setCustomId(`rolereaction_prevemoji_${document.editId}_${pagenum}`)
        .setLabel("❰ 𝗣𝗥𝗘𝗩")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pagenum === 0),
      new ButtonBuilder()
        .setCustomId(`rolereaction_nextemoji_${document.editId}_${pagenum}`)
        .setLabel("𝗡𝗘𝗫𝗧 ❱")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pagenum === totalPages)
    ]

    if (_reaction.emojiId.length > 0) {
      _container.addActionRowComponents(
        (actionRow) => actionRow.setComponents(emojiSelect),
        (actionRow) => actionRow.setComponents(emojiButtons)
      )
    } else {
      _container.addActionRowComponents(
        (actionRow) => actionRow.setComponents(emojiSelect),
        (actionRow) => actionRow.setComponents(emojiButtons)
      )
    }

    _container
      .addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Role:"))
      .addActionRowComponents((actionRow) => actionRow.setComponents(roleSelect))
      .addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Details:"))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(_reaction.details.length > 0 ? `> ### ${_reaction.details}` : "> ").setId(IDS.DETAILS)
          )
          .setButtonAccessory((button) =>
            button.setCustomId(`rolereaction_editdetails_${document.editId}_${pagenum}`).setLabel("𝗘𝗗𝗜𝗧 ✎").setStyle(ButtonStyle.Secondary)
          )
      )
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) => textDisplay.setContent("‎"))
          .setButtonAccessory((button) =>
            button
              .setCustomId(`rolereaction_add_${document.editId}_${pagenum}`)
              .setLabel("𝗔𝗗𝗗 ✚")
              .setStyle(ButtonStyle.Success)
              .setDisabled(_reaction.emojiId.length <= 0 || _reaction.roleId.length <= 0)
          )
      )
  }

  return _container
}

/**
 * Creates an action row for command buttons
 */
const createButtons = (document: RoleReactionMessageData) => {
  const _post = document.reactions.filter((r) => r.published === true).length > 0 && isSnowflake(document.channelId)
  return new ActionRowBuilder<ButtonBuilder>({
    components: [
      new ButtonBuilder().setCustomId(`rolereaction_post_${document.editId}`).setLabel("Post").setStyle(ButtonStyle.Primary).setDisabled(!_post),
      new ButtonBuilder().setCustomId(`rolereaction_cancel_${document.editId}`).setLabel("Cancel").setStyle(ButtonStyle.Danger)
    ]
  })
}

/**
 * Creates an action row for reaction buttons
 */
const createReactions = (document: RoleReactionMessageData) => {
  return new ActionRowBuilder<ButtonBuilder>({
    components: [new ButtonBuilder().setCustomId(`rolereaction_post_${document.editId}`).setLabel("Post").setStyle(ButtonStyle.Secondary)]
  })
}

/**
 * Discord Command
 */
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
    if (!interaction.guild) return

    const _guild = (await DiscordGuild.findOne({ id: interaction.guild.id })) as DiscordGuildData
    const _chan = interaction.channel as TextBasedChannel
    const _channel = client.channels.cache.get(_chan.id) as Channel

    if (interaction.isChatInputCommand()) {
      const m_title = interaction.options.getString("title") as string
      const m_description = interaction.options.getString("description") as string
      const o_colour = interaction.options.getString("color")
      const m_color: number = o_colour ? parseInt(o_colour, 16) : _guild.embedColor

      // Send discord reply
      await interaction.reply({
        components: [createLoading(m_color, m_title, m_description)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Loading
      })
      const reply = await interaction.fetchReply()

      // create documents
      const doc = await new RoleReaction({
        _id: new Databank.Types.ObjectId(),
        guild: _guild._id,
        title: m_title,
        description: m_description,
        color: m_color,
        reactions: [{ _id: new Databank.Types.ObjectId() }],
        messageId: reply.id
      }).save()

      // Update reply with created container component and buttons
      await reply.edit({
        components: [await createComponent(interaction, doc), createButtons(doc)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
      })
    } else if (interaction.isButton()) {
      // Require a text based channel
      if (!_channel.isTextBased() || !_channel.isSendable()) return
      // Get interaction params
      const [, _action, _messageId, _page = undefined] = interaction.customId.split("_")
      const _pagenum: number = parseInt(_page ?? "0", 10)
      const _message = await _channel.messages.fetch(_messageId)

      const currentDoc = await RoleReaction.findOne<RoleReactionMessageData>({ messageId: _messageId })
      if (!currentDoc) return

      const _reaction: RoleReactionData | undefined = currentDoc.reactions.find((r) => r.published === false)

      const emojis = Array.from(interaction.guild.emojis.cache.values())
      const totalPages = Math.ceil(emojis.length / EMOJISPERPAGE)

      if (_action === "nextemoji" && _pagenum < totalPages) {
        await interaction.update({
          components: [await createComponent(interaction, currentDoc, `${_pagenum + 1}`), createButtons(currentDoc)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
        })
      } else if (_action === "prevemoji" && _pagenum > 0) {
        await interaction.update({
          components: [await createComponent(interaction, currentDoc, `${_pagenum - 1}`), createButtons(currentDoc)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
        })
      } else if (_action === "post") {
        await interaction.deferUpdate()

        // Delete the edit message
        await _message.delete()

        // Remove unpublished role reaction
        if (_reaction)
          await RoleReaction.updateOne({ messageId: _messageId }, { $set: { "reactions.$[r]": undefined } }, { arrayFilters: [{ "r._id": _reaction._id }] })

        // Get target channel
        const _target = client.channels.cache.get(currentDoc.channelId)
        if (!_target || !_target.isTextBased() || !_target.isSendable()) return

        // Post to target channel
        const _post = await _target.send({
          components: [createLoading(currentDoc.color, currentDoc.title, currentDoc.description)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
        })

        // Update record
        const updated = await RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
          { messageId: _messageId },
          { $set: { editId: "", postId: _post.id } },
          { returnDocument: "after" }
        )
        if (!updated) return

        // Send confirmation to user
        await _channel.send({
          components: [
            new ContainerBuilder()
              .setId(IDS.CONTAINER)
              .setAccentColor(_guild.embedColor)
              .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Role Reaction message posted in <#${_target.id}>`))
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        })
      } else if (_action === "cancel") {
        // delete from database
        await RoleReaction.deleteOne({ messageId: _messageId })
        // delete from discord
        const message = await _channel.messages.fetch(interaction.message.id)
        await message.delete()
      } else if (_action === "react" && _reaction) {
        if (!interaction.member) return

        const roles = interaction.member.roles as GuildMemberRoleManager
        const hasRole = roles.cache.has(`${_reaction._id}`)

        if (hasRole) {
          await roles.remove(`${_reaction._id}`)
        } else {
          await roles.add(`${_reaction._id}`)
        }

        await interaction.reply({
          embeds: [
            {
              color: _guild.embedColor,
              title: `Role ${hasRole ? "Removed" : "Added"}`,
              description: roleMention(`${_reaction._id}`)
            }
          ],
          ephemeral: true
        })
      } else if (_action === "editdetails" && _reaction) {
        const modal = new ModalBuilder().setCustomId(`rolereaction_savedetails_${interaction.message.id}`).setTitle("Add Details")
        modal.components.push(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId("details").setLabel("Details (Optional):").setRequired(false).setMaxLength(255).setStyle(TextInputStyle.Short)
          )
        )
        await interaction.showModal(modal)
      } else if (_action === "add") {
        await RoleReaction.updateOne({ messageId: _messageId }, { $set: { "reactions.$[r].published": true } }, { arrayFilters: [{ "r.published": false }] })

        const updated = await RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
          { messageId: _messageId },
          { $push: { reactions: { _id: new Databank.Types.ObjectId() } } },
          { returnDocument: "after" }
        )
        if (!updated) return

        const _message = await _channel.messages.fetch(_messageId)
        await _message.edit({
          components: [await createComponent(interaction, updated), createButtons(updated)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
        })
      }
    } else if (interaction.isModalSubmit()) {
      // Require a text based channel
      if (!_channel.isTextBased() || !_channel.isSendable()) return
      // Get interaction params
      const [, _action, _messageId, _page = undefined] = interaction.customId.split("_")
      const _message = await _channel.messages.fetch(_messageId)

      await interaction.deferUpdate()

      const currentDoc = await RoleReaction.findOne<RoleReactionMessageData>({ messageId: _messageId })
      if (!currentDoc) return
      const _reaction: RoleReactionData | undefined = currentDoc.reactions.find((r) => r.published === false)

      if (_action == "savedetails" && _reaction) {
        const _details = interaction.fields.getTextInputValue("details") ?? ""
        const updated = (await RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
          { messageId: _messageId },
          { $set: { "reactions.$[r].details": _details } },
          {
            arrayFilters: [{ "r._id": _reaction._id }],
            returnDocument: "after"
          }
        )) as RoleReactionMessageData
        await _message.edit({
          components: [await createComponent(interaction, updated), createButtons(updated)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
        })
      }
    } else if (interaction.isChannelSelectMenu()) {
      // Require a text based channel
      if (!_channel.isTextBased() || !_channel.isSendable()) return
      // Get interaction params
      const [, _action, _messageId, _page = undefined] = interaction.customId.split("_")
      const _message = await _channel.messages.fetch(_messageId)

      await interaction.deferUpdate()

      if (_action === "selectchannel") {
        const targetChannel = client.channels.cache.get(interaction.values[0] ?? "")
        if (!targetChannel || !targetChannel.isTextBased() || !targetChannel.isSendable()) return

        const updated = (await RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
          { messageId: _messageId },
          { $set: { channelId: targetChannel.id } },
          { returnDocument: "after" }
        )) as RoleReactionMessageData

        await _message.edit({
          components: [await createComponent(interaction, updated, _page), createButtons(updated)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
        })
      }

      //
    } else if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu()) {
      if (!_channel.isTextBased() || !_channel.isSendable()) return
      const [, _action, _messageId, _page = undefined] = interaction.customId.split("_")
      const _message = await _channel.messages.fetch(_messageId)
      // Defer update
      await interaction.deferUpdate()

      if (_action === "selectemoji" || _action === "selectrole") {
        const updated =
          _action === "selectemoji"
            ? ((await RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
                { messageId: _messageId },
                { $set: { "reactions.$[r].emoji": interaction.values[0] ?? "" } },
                {
                  arrayFilters: [{ "r.published": false }],
                  returnDocument: "after"
                }
              )) as RoleReactionMessageData)
            : ((await RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
                { messageId: _messageId },
                { $set: { "reactions.$[r].role": interaction.values[0] ?? "" } },
                {
                  arrayFilters: [{ "r.published": false }],
                  returnDocument: "after"
                }
              )) as RoleReactionMessageData)

        await _message.edit({
          components: [await createComponent(interaction, updated), createButtons(updated)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
        })
      }
    }
  }
}

export default commandRoleReaction
