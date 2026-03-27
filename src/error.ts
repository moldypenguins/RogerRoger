/**
 * @file error.ts
 * @description Global error reporter for Discord interactions and events
 * @version 2026-03-24
 */

import util from "node:util"

import type { Interaction } from "discord.js"
import { ContainerBuilder, MessageFlags } from "discord.js"

import type { DiscordBot, DiscordGuildData } from "./types/index.js"
import { DiscordGuild } from "./databank/index.js"

const MAX_LOG_CHARS = 1800

const truncate = (value: string, limit: number) => (value.length > limit ? `${value.slice(0, limit - 3)}...` : value)

const formatError = (err: unknown) => {
  if (err instanceof Error) {
    const stack = err.stack ? `\n${err.stack}` : ""
    return `${err.name}: ${err.message}${stack}`
  }
  return util.inspect(err, { depth: null, colors: false })
}

export const extractGuildId = (args: unknown[]): string | undefined => {
  for (const arg of args) {
    if (!arg || typeof arg !== "object") continue
    const maybeGuildId = (arg as { guildId?: unknown }).guildId
    if (typeof maybeGuildId === "string" && maybeGuildId.length > 0) return maybeGuildId

    const maybeGuild = (arg as { guild?: { id?: unknown } }).guild
    if (maybeGuild && typeof maybeGuild.id === "string" && maybeGuild.id.length > 0) return maybeGuild.id
  }
  return undefined
}

export const reportDiscordError = async (
  client: DiscordBot,
  error: unknown,
  context: {
    source: string
    guildId?: string
    interaction?: Interaction
    extra?: string
  }
) => {
  const errorId = Date.now().toString(36)
  const errorText = truncate(formatError(error), MAX_LOG_CHARS)
  const contextText = context.extra ? `\n${context.extra}` : ""

  console.error(`[ERROR ${errorId}] ${context.source}${contextText}\n${errorText}`)

  if (context.interaction && context.interaction.isRepliable() && context.interaction.guild) {
    try {
      const _guild = (await DiscordGuild.findOne({ id: context.interaction.guild.id })) as DiscordGuildData
      const replyPayload = {
        components: [
          new ContainerBuilder()
            .setAccentColor(_guild.embedColor)
            .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`An error occurred while processing this request. (error: ${errorId})`))
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      }

      if (context.interaction.deferred || context.interaction.replied) {
        await context.interaction.followUp(replyPayload)
      } else {
        await context.interaction.reply(replyPayload)
      }
    } catch {
      // Ignore interaction reply errors
    }
  }

  const guildId = context.guildId ?? context.interaction?.guildId
  if (!guildId) return

  const guildDoc = await DiscordGuild.findOne({ id: guildId })
  const logsChannelId = guildDoc?.logsChannelId
  if (!logsChannelId) return

  const channel = client.channels.cache.get(logsChannelId)
  if (!channel || !channel.isTextBased() || !channel.isSendable()) return

  await channel.send({
    content: `### Error (${errorId})\nSource: ${context.source}\n\n\`\`\`\n${errorText}\n\`\`\``
  })
}
