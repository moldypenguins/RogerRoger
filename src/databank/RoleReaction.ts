/**
 * @name RoleReaction.js
 * @version 2026-02-19
 * @summary RoleReaction document schema
 **/

import { model, Schema } from "mongoose"
import { RoleReactionData, RoleReactionMessageData } from "../types/index.js"
import mongooseAutoPopulate from "mongoose-autopopulate"
import DiscordGuild from "./DiscordGuild.js"

const RoleReactionSchema = new Schema<RoleReactionData>({
  _id: { type: Schema.Types.ObjectId, required: true },
  emojiId: { type: String, default: "" },
  roleId: { type: String, default: "" },
  details: { type: String, default: "" },
  published: { type: Boolean, default: false }
})

let RoleReactionMessageSchema = new Schema<RoleReactionMessageData>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    guild: { type: Schema.Types.ObjectId, required: true, ref: DiscordGuild },
    title: { type: String, required: true },
    description: { type: String, required: true },
    color: { type: Number, default: 14406576 },
    reactions: { type: [RoleReactionSchema], default: [] },
    channelId: { type: String, default: "" },
    editId: { type: String, default: "" },
    postId: { type: String, default: "" }
  },
  {
    timestamps: true
  }
)

/**
 * Enforce that editId/postId are unique ONLY when present and non-empty.
 */
RoleReactionMessageSchema.index(
  { editId: 1 },
  {
    unique: true,
    partialFilterExpression: { editId: { $type: "string", $ne: "" } }
  }
)
RoleReactionMessageSchema.index(
  { postId: 1 },
  {
    unique: true,
    partialFilterExpression: { postId: { $type: "string", $ne: "" } }
  }
)

RoleReactionMessageSchema.plugin(mongooseAutoPopulate)

export default model<RoleReactionMessageData>("RoleReaction", RoleReactionMessageSchema, "RoleReactions")
