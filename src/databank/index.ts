/**
 * @name databank.ts
 * @version 2026-01-13
 * @summary Database
 **/

import mongoose from "mongoose"
import DiscordGuild from "./DiscordGuild.js"
import DiscordUser from "./DiscordUser.js"
import FoxholeStockpile from "./FoxholeStockpile.js"
import FoxholeTown from "./FoxholeTown.js"

import Config from "../config/index.js"

mongoose.set("strictQuery", true)
mongoose.connect(Config.database).catch((err) => console.log(err.reason))
mongoose.connection.on("error", (err) => console.log(err.reason))
mongoose.connection.once("open", () => console.log("Database loaded."))

export { mongoose as Databank, DiscordGuild, DiscordUser, FoxholeStockpile, FoxholeTown }
