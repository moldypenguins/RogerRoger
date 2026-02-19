/**
 * @name index.ts
 * @version 2026-01-13
 * @summary Command handlers
 **/
"use strict"

import type { DiscordCommand } from "../types/index.js"
import rolereaction from "./rolereaction.js"
import setup from "./setup.js"
import stockpile from "./stockpile.js"

/**
 * Strongly typed collection of Discord command handlers
 */
const DiscordCommands: Record<string, DiscordCommand> = {
  rolereaction,
  setup,
  stockpile
} as const

export default DiscordCommands
