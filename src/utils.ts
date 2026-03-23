/**
 * @file utils.ts
 * @description Role reaction commands for creating interactive role assignment messages
 * @version 2026-02-26
 */

/** Checks whether a string is a valid Discord snowflake id */
export const isSnowflake = (value: unknown): value is string => typeof value === "string" && /^[0-9]{15,25}$/.test(value)
