/**
 * @name FoxholeTown.js
 * @version 2026-02-06
 * @summary FoxholeTown interface and schema
 **/
"use strict"

import { model, Schema } from "mongoose"
import { FoxholeTownData } from "../types"

let FoxholeTownSchema = new Schema<FoxholeTownData>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    hex: { type: String, required: true },
    name: { type: String, required: true },
    building: { type: String, required: true }
  },
  {
    timestamps: true
  }
)

export default model<FoxholeTownData>("FoxholeTown", FoxholeTownSchema, "FoxholeTowns")
