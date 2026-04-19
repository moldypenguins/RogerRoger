/**
 * @name events/MessageCreate.ts
 * @version 2026-02-04
 * @summary Handles new message creation events
 **/

import { Events, Message } from "discord.js"
import type { DiscordBot, DiscordEvent } from "../types/index.js"
import Config from "../config/index.js"
// import { Databank } from "../databank/index.js"
import { ofetch } from "ofetch"

async function updatePlayerCount(client: DiscordBot, online: number) {
  const _chan = client.channels.cache.get("1468684145856086260")
  if (!_chan || _chan.isDMBased() || _chan.isThread()) return
  if ("setName" in _chan && typeof _chan.setName === "function") {
    await _chan.setName(`🏃‍➡️｜𝘚𝘜𝘙𝘝𝘐𝘝𝘖𝘙𝘚-𝘖𝘕𝘓𝘐𝘕𝘌〘${online}}〙`, "Server status webhook update").catch(() => null)
  }
}

/** Message create event handler */
const ev: DiscordEvent = {
  name: Events.MessageCreate,
  once: false,
  execute: async (client: DiscordBot, message: Message) => {
    if (message.author.bot) return

    // --- WEBHOOK HANDLER ---
    if (message.webhookId) {
      switch (message.webhookId) {
        // SERVER STATUS
        case "1475790781813096468":
          const _chan = client.channels.cache.get("1468684245466615828")
          if (!_chan || _chan.isDMBased() || _chan.isThread()) break
          if ("setName" in _chan && typeof _chan.setName === "function") {
            const _emoji = message.content.toLowerCase().includes("online") ? "🟢" : "🔴"
            await _chan.setName(`ℹ️｜𝘚𝘌𝘙𝘝𝘌𝘙-𝘚𝘛𝘈𝘛𝘜𝘚〘${_emoji}〙`, "Server status webhook update").catch(() => null)
            updatePlayerCount(client, 0)
          }
          break

        // PLAYER JOIN
        case "1475789690538819698":
          try {
            const data = await ofetch("https://cftools.cloud/69829098309ef3fce02b984f", {
              headers: {
                Authorization: "Bearer 9744861d-6033-4e4e-8bfb-ab4059e774ee"
              }
            })
            updatePlayerCount(client, data.status?.players?.online ?? 0)
          } catch (error) {
            console.error("Failed to fetch CFTools data:", error)
          }
          break
      }
    }

    // Log message if debug mode
    if (Config.debug) console.log(`Message from ${message.author.tag}: ${message.content}`)
  }
}

export default ev
