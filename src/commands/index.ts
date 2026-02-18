/**
 * @name index.ts
 * @version 2026-01-13
 * @summary Command handlers
 **/
"use strict"

import type { DiscordCommand } from "../types"
import rolereaction from "./rolereaction"
import setup from "./setup"
import stockpile from "./stockpile"

/**
 * Strongly typed collection of Discord command handlers
 */
const DiscordCommands: Record<string, DiscordCommand> = {
  rolereaction,
  setup,
  stockpile
} as const

export default DiscordCommands
