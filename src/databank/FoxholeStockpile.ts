/**
 * @name FoxholeStockpile.js
 * @version 2026-02-06
 * @summary FoxholeStockpile interface and schema
 **/
"use strict"

import { model, Schema } from "mongoose"

import { FoxholeStockpileData } from "../types"

import mongooseAutoPopulate from "mongoose-autopopulate"
import DiscordGuild from "./DiscordGuild"
import DiscordUser from "./DiscordUser"
import FoxholeTown from "./FoxholeTown"

let FoxholeStockpileSchema = new Schema<FoxholeStockpileData>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    guild: { type: Schema.Types.ObjectId, required: true, ref: DiscordGuild },
    town: { type: Schema.Types.ObjectId, required: true, ref: FoxholeTown, autopopulate: true },
    code: { type: String, required: true },
    messageId: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: DiscordUser, autopopulate: true }
  },
  {
    timestamps: true
  }
)
FoxholeStockpileSchema.plugin(mongooseAutoPopulate)

export default model<FoxholeStockpileData>("FoxholeStockpile", FoxholeStockpileSchema, "FoxholeStockpiles")
