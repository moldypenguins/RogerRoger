/**
 * @name index.ts
 * @version 2026-01-13
 * @summary Main entry point for the bot
 **/

"use strict"

// node imports
import util from "node:util"

// module imports
import { APIApplicationCommand, Client, GatewayIntentBits, REST, Routes } from "discord.js"

// local imports
import Config from "./config"
import { Databank } from "./databank"
import DiscordEvents from "./events"
import DiscordCommands from "./commands"

import minimist from "minimist"
let argv = minimist(process.argv.slice(2), {
  string: [],
  boolean: ["register"],
  alias: { r: "register" },
  default: { register: false },
  unknown: () => false
})

/**
 * Initializes and starts the bot
 */
async function main(): Promise<void> {
  // Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessagePolls,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.GuildExpressions,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessagePolls,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent
    ]
  })

  /** Register event handlers */
  Object.values(DiscordEvents).forEach((event) => {
    if (event.once) {
      if (Config.debug) console.log(`Registered Event: Once ${event.name}`)
      client.once(event.name, (...args) => event.execute(client, ...args))
    } else {
      if (Config.debug) console.log(`Registered Event: On ${event.name}`)
      client.on(event.name, (...args) => event.execute(client, ...args))
    }
  })

  /** Login */
  console.log("Attempting login...")
  await client.login(Config.discord.token)
  //EDZ: 1235712833468104765
  //TOR:  549157326137851904
}

Databank.connection.once("open", async () => {
  if (argv.register) {
    // register bot commands
    const rest = new REST().setToken(Config.discord.token)
    ;(async () => {
      try {
        const botCommands = []
        for (let [key, value] of Object.entries(DiscordCommands)) {
          botCommands.push(value.data.toJSON())
        }
        const data = (await rest.put(Routes.applicationCommands(Config.discord.client_id), {
          body: botCommands
        })) as APIApplicationCommand[]
        console.log(`Reloaded ${data.length} discord commands.`)
      } catch (err) {
        console.error(err)
      }
    })()
  } else {
    // run bot
    console.log("Starting bot...")
    main().catch(console.error)
  }
})

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)")
  process.exit(0)
})
