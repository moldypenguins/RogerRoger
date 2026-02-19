/**
 * @name config.example.ts
 * @version 2026-01-13
 * @summary Example local configuration - Copy this to config.ts and fill in your values
 **/

import { Config } from "../types/index.js"

const localConfig: Config = {
  debug: false,
  database: "mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority",
  discord: {
    token: "YOUR_DISCORD_BOT_TOKEN_HERE", // 72 character Discord bot token
    client_id: "YOUR_DISCORD_CLIENT_ID",
    activity: "YOUR_DISCORD_BOT_ACTIVITY"
  },
  steam: {
    api_key: "YOUR_STEAM_API_KEY"
  }
}

export default localConfig
