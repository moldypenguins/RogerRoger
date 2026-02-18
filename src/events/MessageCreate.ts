/**
 * @name events/MessageCreate.ts
 * @version 2026-02-04
 * @summary Handles new message creation events
 **/
"use strict"

import { Client, Events, Message } from "discord.js"
import type { DiscordEvent } from "../types"
import Config from "../config"
// import { Databank } from "../databank"

/** Message create event handler */
const ev: DiscordEvent = {
  name: Events.MessageCreate,
  once: false,
  execute: (client: Client, message: Message) => {
    if (message.author.bot) return

    // Handle message logic here
    if (Config.debug) console.log(`Message from ${message.author.tag}: ${message.content}`)
  }
}

export default ev
