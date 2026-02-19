/**
 * @name databank.ts
 * @version 2026-01-13
 * @summary Database
 **/

import Config from "../config"
import mongoose from "mongoose"
import DiscordGuild from "./DiscordGuild"
import DiscordUser from "./DiscordUser"
import FoxholeStockpile from "./FoxholeStockpile"
import FoxholeTown from "./FoxholeTown"

mongoose.set("strictQuery", true)
mongoose.connect(Config.database).catch((err) => console.log(err.reason))
mongoose.connection.on("error", (err) => console.log(err.reason))
mongoose.connection.once("open", () => console.log("Database loaded."))

export { mongoose as Databank, DiscordGuild, DiscordUser, FoxholeStockpile, FoxholeTown }
