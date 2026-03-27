/**
 * @file commands/rolereaction.ts
 * @description Role reaction commands for creating interactive role assignment messages
 * @version 2026-02-19
 */

//import util from "node:util"

import {
  ModalBuilder,
  ContainerBuilder,
  SlashCommandBuilder,
  SeparatorSpacingSize,
  MessageEditOptions,
  GuildMemberRoleManager,
  GuildEmoji,
  Interaction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  TextChannel,
  InteractionContextType,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  roleMention,
  MessageFlags,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder,
  ChannelType,
  Message
} from "discord.js"

// local imports
import Config from "../config/index.js"
import type { DiscordBot, DiscordCommand, DiscordGuildData, RoleReactionMessageData, RoleReactionData } from "../types/index.js"
import { Databank, DiscordGuild, RoleReaction } from "../databank/index.js"
import { isSnowflake, LoadingContainer } from "../utils.js"

const EMOJISPERPAGE = 24

const buildDraftPayload = async (interaction: Interaction, document: RoleReactionMessageData, page?: string) => {
  return {
    components: [await createComponent(interaction, document, page), createButtons(document)],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
  }
}

const buildPostedPayload = async (interaction: Interaction, document: RoleReactionMessageData, messageId: string) => {
  return {
    components: [await createComponent(interaction, document), createReactions(document, messageId)],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
  }
}

type UpdateableInteraction = Interaction & { update: (options: MessageEditOptions) => Promise<unknown> }

const isUpdateableInteraction = (interaction: Interaction): interaction is UpdateableInteraction => {
  return "update" in interaction && typeof (interaction as { update?: unknown }).update === "function"
}

class RoleReactionOps {
  constructor(
    private client: DiscordBot,
    private interaction: Interaction,
    private channel: TextChannel,
    private guildData: DiscordGuildData
  ) {}

  parseCustomId(customId: string) {
    const [, action, messageId, data = undefined] = customId.split("_")
    return { action, messageId, data }
  }

  async fetchMessage(messageId: string): Promise<Message | null> {
    if (!this.interaction.channel || !this.interaction.channel.isTextBased()) return null
    try {
      return await this.interaction.channel.messages.fetch(messageId)
    } catch {
      return null
    }
  }

  async getDraft(messageId: string) {
    return RoleReaction.findOne<RoleReactionMessageData>({ editId: messageId })
  }

  async editDraftMessage(message: Message, document: RoleReactionMessageData, page?: string): Promise<void> {
    await message.edit(await buildDraftPayload(this.interaction, document, page))
  }

  async updateInteractionDraft(document: RoleReactionMessageData, page?: string): Promise<void> {
    if (!isUpdateableInteraction(this.interaction)) return
    await this.interaction.update(await buildDraftPayload(this.interaction, document, page))
  }

  async updateDraftReactionField(messageId: string, field: "emojiId" | "roleId", value: string) {
    return RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
      { editId: messageId },
      { $set: { [`reactions.$[r].${field}`]: value } },
      {
        arrayFilters: [{ "r.published": false }],
        returnDocument: "after"
      }
    )
  }

  async updateDraftDetails(messageId: string, reactionId: string, details: string) {
    return RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
      { editId: messageId },
      { $set: { "reactions.$[r].details": details } },
      {
        arrayFilters: [{ "r._id": reactionId }],
        returnDocument: "after"
      }
    )
  }

  async updateDraftChannel(messageId: string, channelId: string) {
    return RoleReaction.findOneAndUpdate<RoleReactionMessageData>({ editId: messageId }, { $set: { channelId } }, { returnDocument: "after" })
  }

  async setDraftPublished(messageId: string) {
    await RoleReaction.updateOne({ editId: messageId }, { $set: { "reactions.$[r].published": true } }, { arrayFilters: [{ "r.published": false }] })
    return RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
      { editId: messageId },
      { $push: { reactions: { _id: new Databank.Types.ObjectId() } } },
      { returnDocument: "after" }
    )
  }

  async removeDraftReaction(messageId: string, reactionId: string) {
    await RoleReaction.updateOne({ editId: messageId }, { $pull: { reactions: { _id: reactionId } } })
  }

  async postMessage(document: RoleReactionMessageData): Promise<{ posted: Message; updated: RoleReactionMessageData }> {
    const target = this.client.channels.cache.get(document.channelId)
    if (!target || !target.isTextBased() || !target.isSendable()) {
      throw new Error("Target channel is not sendable for role reaction post.")
    }

    const posted = await target.send({
      components: [LoadingContainer(document.color, document.title, document.description)],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Loading
    })

    const updated = await RoleReaction.findOneAndUpdate<RoleReactionMessageData>(
      { editId: document.editId },
      { $set: { editId: "", postId: posted.id } },
      { returnDocument: "after" }
    )

    if (!updated) {
      throw new Error("Failed to update role reaction post record.")
    }

    await posted.edit(await buildPostedPayload(this.interaction, updated, document.editId))

    return { posted, updated }
  }

  async sendPostConfirmation(channelId: string) {
    await this.channel.send({
      components: [
        new ContainerBuilder()
          .setAccentColor(this.guildData.embedColor)
          .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`### Role Reaction message posted in <#${channelId}>`))
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    })
  }
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
    .setAccentColor(document.color)
    .addTextDisplayComponents(
      (textDisplay) => textDisplay.setContent(`# ${document.title}`),
      (textDisplay) => textDisplay.setContent(`***${document.description.replace(/\\n/g, "\n")}***`)
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Role Reactions:"))

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
          .addTextDisplayComponents((textDisplay) => textDisplay.setContent(_reaction.details.length > 0 ? `> ### ${_reaction.details}` : "> "))
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
const createReactions = (document: RoleReactionMessageData, messageId: string) => {
  const _reactions: RoleReactionData[] = document.reactions.filter((m) => m.published === true)
  var _row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>({ components: [] })
  for (const _r of _reactions) {
    _row.addComponents([new ButtonBuilder().setCustomId(`rolereaction_react_${messageId}_${_r.roleId}`).setEmoji(_r.emojiId).setStyle(ButtonStyle.Secondary)])
  }
  return _row
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

    // CUDL operations
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new role reaction message.")
        .addStringOption((option) => option.setName("title").setDescription("The role reaction title.").setRequired(true).setMaxLength(255))
        .addStringOption((option) => option.setName("description").setDescription("The role reaction description.").setRequired(true).setMaxLength(2000))
        .addStringOption((option) => option.setName("color").setDescription("The role reaction color hex.").setRequired(false).setMinLength(6).setMaxLength(6))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update an existing role reaction message.")
        .addStringOption((option) => option.setName("messageid").setDescription("The message id.").setRequired(true).setMaxLength(64))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete an existing role reaction message.")
        .addStringOption((option) => option.setName("messageid").setDescription("The message id.").setRequired(true).setMaxLength(64))
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all existing role reaction messages.")),

  async execute(client: DiscordBot, interaction: Interaction): Promise<void> {
    // Require guild
    if (!interaction.guild) return

    const _guild = (await DiscordGuild.findOne({ id: interaction.guild.id })) as DiscordGuildData
    const _chan = interaction.channel as TextChannel
    //const _channel = client.channels.cache.get(_chan.id) as Channel

    // Require a text based and sendable channel
    if (!_chan.isTextBased() || !_chan.isSendable()) return

    const ops = new RoleReactionOps(client, interaction, _chan, _guild)

    if (interaction.isChatInputCommand()) {
      const _subcommand = interaction.options.getSubcommand()

      switch (_subcommand) {
        case "create":
          const m_title = interaction.options.getString("title") as string
          const m_description = interaction.options.getString("description") as string
          const o_colour = interaction.options.getString("color")
          const m_color: number = o_colour ? parseInt(o_colour, 16) : _guild.embedColor

          // Send discord reply
          await interaction.reply({
            components: [LoadingContainer(m_color, m_title, m_description)],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Loading
          })
          const reply = await interaction.fetchReply()

          // create document
          const c_doc = await new RoleReaction({
            _id: new Databank.Types.ObjectId(),
            guild: _guild._id,
            title: m_title,
            description: m_description,
            color: m_color,
            reactions: [{ _id: new Databank.Types.ObjectId() }],
            editId: reply.id,
            postId: ""
          }).save()

          // Update reply with created container component and buttons
          await reply.edit(await buildDraftPayload(interaction, c_doc))

          break
        case "update":
          const u_messageId = interaction.options.getString("messageid") as string

          // retrieve document
          const u_doc = await RoleReaction.findOne<RoleReactionMessageData>({ postId: u_messageId })
          if (!u_doc) return

          // Reply with created container component and buttons
          await interaction.reply(await buildDraftPayload(interaction, u_doc))

          break
        case "delete":
          const d_messageId = interaction.options.getString("messageid") as string

          // delete document
          await RoleReaction.deleteOne({ postId: d_messageId })
          //delete message
          await _chan.messages.delete(d_messageId)

          await interaction.reply({
            components: [
              new ContainerBuilder()
                .setAccentColor(_guild.embedColor)
                .addTextDisplayComponents((textDisplay) => textDisplay.setContent("Role reaction deleted."))
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          })

          break
        case "list":
          const l_docs = await RoleReaction.find<RoleReactionMessageData>({
            postId: { $exists: true, $nin: [null, ""] }
          })

          await interaction.reply({
            components: [
              new ContainerBuilder()
                .setAccentColor(_guild.embedColor)
                .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`Role reactions:\n${l_docs.map((d) => d.postId).join("\n")}`))
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          })

          break
      }
    } else if (interaction.isButton()) {
      // Get interaction params
      const { action: _action, messageId: _messageId, data: _data } = ops.parseCustomId(interaction.customId)

      if (Config.debug) console.log(`VARS: ${_action}, ${_messageId}, ${_data ?? "null"}`)

      const draftOnlyActions = new Set(["nextemoji", "prevemoji", "post", "cancel", "editdetails", "add"])

      if (_action === "react") {
        if (!interaction.member || !_data) return

        const roles = interaction.member.roles as GuildMemberRoleManager
        const hasRole = roles.cache.has(`${_data}`)

        if (hasRole) {
          await roles.remove(`${_data}`)
        } else {
          await roles.add(`${_data}`)
        }

        await interaction.reply({
          components: [
            new ContainerBuilder()
              .setAccentColor(_guild.embedColor)
              .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`# Role ${hasRole ? "Removed" : "Added"}\n` + roleMention(`${_data}`)))
          ],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        })

        return
      }

      if (!draftOnlyActions.has(_action)) return

      const currentDoc = await ops.getDraft(_messageId)
      if (!currentDoc) return

      const _reaction: RoleReactionData | undefined = currentDoc.reactions.find((r) => r.published === false)

      const emojis = Array.from(interaction.guild.emojis.cache.values())
      const totalPages = Math.ceil(emojis.length / EMOJISPERPAGE)

      if (_action === "nextemoji" || _action === "prevemoji") {
        const _pagenum: number = parseInt(_data ?? "0", 10)

        if (_action === "nextemoji" && _pagenum < totalPages) {
          await ops.updateInteractionDraft(currentDoc, `${_pagenum + 1}`)
        } else if (_action === "prevemoji" && _pagenum > 0) {
          await ops.updateInteractionDraft(currentDoc, `${_pagenum - 1}`)
        }
      } else if (_action === "post") {
        const _message = await ops.fetchMessage(_messageId)
        if (!_message) return

        await interaction.deferUpdate()

        // Delete the edit message
        await _message.delete()

        // Remove unpublished role reaction
        if (_reaction) {
          await ops.removeDraftReaction(_messageId, `${_reaction._id}`)
        }

        try {
          const postResult = await ops.postMessage(currentDoc)
          await ops.sendPostConfirmation(postResult.posted.channelId)
        } catch {
          return
        }
      } else if (_action === "cancel") {
        const _message = await ops.fetchMessage(_messageId)
        if (!_message) return
        //TODO: fix this

        // Delete from database
        await RoleReaction.deleteOne({ editId: _messageId })
        // delete from discord
        const message = await _chan.messages.fetch(interaction.message.id)
        await message.delete()

        // Delete the edit message
        await _message.delete()
      } else if (_action === "editdetails" && _reaction) {
        const modal = new ModalBuilder().setCustomId(`rolereaction_savedetails_${interaction.message.id}`).setTitle("Add Details")
        modal.components.push(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId("details").setLabel("Details (Optional):").setRequired(false).setMaxLength(255).setStyle(TextInputStyle.Short)
          )
        )
        await interaction.showModal(modal)
      } else if (_action === "add") {
        const updated = await ops.setDraftPublished(_messageId)
        if (!updated) return

        const _message = await ops.fetchMessage(_messageId)
        if (!_message) return
        await ops.editDraftMessage(_message, updated)
      }
    } else if (interaction.isModalSubmit()) {
      // Get interaction params
      const { action: _action, messageId: _messageId } = ops.parseCustomId(interaction.customId)
      const _message = await ops.fetchMessage(_messageId)
      if (!_message) return

      await interaction.deferUpdate()

      const currentDoc = await ops.getDraft(_messageId)
      if (!currentDoc) return
      const _reaction: RoleReactionData | undefined = currentDoc.reactions.find((r) => r.published === false)

      if (_action == "savedetails" && _reaction) {
        const _details = interaction.fields.getTextInputValue("details") ?? ""
        const updated = (await ops.updateDraftDetails(_messageId, `${_reaction._id}`, _details)) as RoleReactionMessageData
        await ops.editDraftMessage(_message, updated)
      }
    } else if (interaction.isChannelSelectMenu()) {
      await interaction.deferUpdate()

      // Get interaction params
      const { action: _action, messageId: _messageId, data: _page } = ops.parseCustomId(interaction.customId)
      const _message = await ops.fetchMessage(_messageId)
      if (!_message) return

      if (_action === "selectchannel") {
        const targetChannel = client.channels.cache.get(interaction.values[0] ?? "")
        if (!targetChannel || !targetChannel.isTextBased() || !targetChannel.isSendable()) return

        const updated = (await ops.updateDraftChannel(_messageId, targetChannel.id)) as RoleReactionMessageData

        await ops.editDraftMessage(_message, updated, _page)
      }

      //
    } else if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu()) {
      const { action: _action, messageId: _messageId, data: _page } = ops.parseCustomId(interaction.customId)
      const _message = await ops.fetchMessage(_messageId)
      if (!_message) return
      // Defer update
      await interaction.deferUpdate()

      if (_action === "selectemoji" || _action === "selectrole") {
        const updated =
          _action === "selectemoji"
            ? ((await ops.updateDraftReactionField(_messageId, "emojiId", interaction.values[0] ?? "")) as RoleReactionMessageData)
            : ((await ops.updateDraftReactionField(_messageId, "roleId", interaction.values[0] ?? "")) as RoleReactionMessageData)

        await ops.editDraftMessage(_message, updated)
      }
    }
  }
}

export default commandRoleReaction
