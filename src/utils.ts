/**
 * @file utils.ts
 * @description Role reaction commands for creating interactive role assignment messages
 * @version 2026-02-26
 */

import { ContainerBuilder, SeparatorSpacingSize } from "discord.js"

/** Checks whether a string is a valid Discord snowflake id */
export const isSnowflake = (value: unknown): value is string => typeof value === "string" && /^[0-9]{15,25}$/.test(value)

/** Creates a loading container  */
export const LoadingContainer = (color: number, title: string, description: string) => {
  return new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(
      (textDisplay) => textDisplay.setContent(`# ${title}`),
      (textDisplay) => textDisplay.setContent(`***${description.replace(/\\n/g, "\n")}***`)
    )
    .addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent("### Loading..."))
}
