/**
 * @name DiscordBot.ts
 * @version 2026-02-18
 * @summary Extended Discord client with custom bot functionality
 **/

// module imports
import { APIApplicationCommand, Client, GatewayIntentBits, REST, Routes } from "discord.js"

// local imports
import Config from "./config"
import DiscordEvents from "./events"
import DiscordCommands from "./commands"

/**
 * Extended Discord Client with command and event handling
 */
export class DiscordBot extends Client {
  /** Creates a new DiscordBot instance */
  constructor() {
    super({
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
  }

  /** Registers bot commands with discord */
  public async register(): Promise<void> {
    const rest = new REST().setToken(Config.discord.token)
    ;(async () => {
      try {
        const botCommands = []
        for (let [, value] of Object.entries(DiscordCommands)) {
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
  }

  /** Logs in the bot with the provided token */
  public async start(): Promise<void> {
    /** Register event handlers */
    console.log("Registering event handlers...")
    Object.values(DiscordEvents).forEach((event) => {
      if (event.once) {
        if (Config.debug) console.log(`Registered Event: Once ${event.name.toString()}`)
        this.once(event.name as string, (...args) => event.execute(this, ...args))
      } else {
        if (Config.debug) console.log(`Registered Event: On ${event.name.toString()}`)
        this.on(event.name as string, (...args) => event.execute(this, ...args))
      }
    })

    /** Login */
    console.log("Attempting login...")
    await this.login(Config.discord.token)
    //EDZ: 1235712833468104765
    //TOR:  549157326137851904
  }

  /** Gracefully shuts down the bot */
  public async shutdown(): Promise<void> {
    console.log("Destroying bot...")
    await this.destroy()
  }
}
