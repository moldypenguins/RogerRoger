# AI Agent Instructions — RogerRoger

Purpose: quickly orient an AI coding assistant so it can be immediately productive editing, adding features, or fixing bugs.

* **Big picture architecture**
  + Discord bot built on discord.js 14 with a custom `DiscordBot` client in `src/bot.ts`.
  + Entry point is `src/index.ts`: connects to the databank, then registers commands or starts the bot.
  + Commands live in `src/commands/` and are registered in `src/commands/index.ts`.
  + Events live in `src/events/` and are registered in `src/events/index.ts`.
  + MongoDB models and types are in `src/databank/` and `src/types/`.

* **When making changes**
  + Keep commits/patches atomic; one concern per diff.
  + Preserve numeric ordering in content filenames; only renumber intentionally and adjust related indices.
  + Run lint & type checks before completion: `pnpm run lint`;  `pnpm run build`.
  + Confirm before large refactors; default to minimal surface edits.
  + Keep markdown frontmatter consistent; add new fields to all localized copies.

* **Where to look for typical changes**
  + Commands: `src/commands/*.ts` with exports aggregated in `src/commands/index.ts`.
  + Events: `src/events/*.ts` with exports aggregated in `src/events/index.ts`.
  + Bot client behavior: `src/bot.ts`.
  + Config and secrets: `src/config/local.ts` (local only) and `src/config/local.example.ts` (template).
  + Database schemas: `src/databank/*.ts`.

* **Project-specific conventions**
  + Comments: comment code following the project's conventions; keep comments concise, consistent, and helpful.
  + Commit convention: Conventional Commits (`feat:`,   `fix:`,   `docs:`,   `refactor:`,   `chore:`,   `style:`).
  + Prefer extending existing command/event patterns instead of introducing new registries.
  + Treat config values as secrets; do not log tokens or API keys.

* **Common code standards to follow**
  + TypeScript (ESM) style; keep imports ordered: node/third-party before local.
  + Use existing `DiscordCommand` and `DiscordEvent` types from `src/types/`.
  + Validate IDs with `isSnowflake` in `src/utils.ts` where applicable.

* **Agent Operating Rules**
  + Avoid wasting tokens: read only necessary files; targeted searches over full dumps.
  + Default to concise answers; expand only when user requests more detail.
  + Use `apply_patch` for edits; never invent paths; keep diffs minimal.
  + Confirm intent before broad refactors or dependency additions.
  + Maintain existing style & formatting; no gratuitous rearranging.
  + Cite official docs below for framework specifics; avoid guessing.
  + No secrets or credentials exposure; treat env config as sensitive.
  + Provide aggregated patches rather than noisy micro‑diffs unless user asks.
  + Justify any new dependency; prefer native discord.js or Node APIs.
  + Clarify assumptions instead of guessing when ambiguity exists.
  + Avoid unnecessary verbosity; do not restate unchanged plans.
  + Only run tests/lint relevant to changes; avoid full scans unless needed.

* **Context Documentation** - The following official documentation sites are useful context for working in this repository:
  + `https://www.typescriptlang.org/docs/`: TypeScript documentation.
  + `https://docs.discord.com/developers/`: Discord Developer Platform documentation.
  + `https://discord.js.org/docs`: discord.js documentation.
