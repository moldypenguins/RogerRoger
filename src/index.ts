/**
 * @name index.ts
 * @version 2026-01-13
 * @summary Main entry point for the bot
 **/

"use strict"

// local imports
import { Databank } from "./databank"
import { DiscordBot } from "./bot"

import minimist from "minimist"
let argv = minimist(process.argv.slice(2), {
  string: [],
  boolean: ["register"],
  alias: { r: "register" },
  default: { register: false },
  unknown: () => false
})

// Discord client
const discord_bot = new DiscordBot()

// Once database is connected
Databank.connection.once("open", async () => {
  if (argv.register) {
    await discord_bot.register()
  } else {
    await discord_bot.start()
  }
})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)")
  await discord_bot.shutdown()
  process.exit(0)
})
