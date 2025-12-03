#!/usr/bin/env node

/**
 * Run Supabase CLI commands against a target database URL.
 * Requires SUPABASE_DB_URL (or DATABASE_URL) to be set (e.g., your hosted Supabase connection string).
 */
const { spawnSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");

const action = process.argv[2] ?? "up";
let dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

// Fallback: load from .env.local if present.
if (!dbUrl && existsSync(resolve(__dirname, "..", ".env.local"))) {
  try {
    const envText = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
    for (const line of envText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      const value = rest.join("=").trim();
      if (!dbUrl && key === "SUPABASE_DB_URL") dbUrl = value;
      if (!dbUrl && key === "DATABASE_URL") dbUrl = value;
    }
  } catch (error) {
    console.warn("Could not read .env.local:", error);
  }
}

if (!dbUrl && action !== "studio") {
  console.error("SUPABASE_DB_URL (or DATABASE_URL) is required. Set it to your database connection string.");
  process.exit(1);
}

const commands = {
  up: ["supabase", "migration", "up"],
  reset: ["supabase", "db", "reset"],
  studio: ["supabase", "studio"]
};

const cmd = commands[action];

if (!cmd) {
  console.error(`Unknown action "${action}". Use one of: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}

const args = ["--filter", "@spheresconnect/web", "exec", ...cmd];

if (action !== "studio") {
  args.push("--db-url", dbUrl);
}

const result = spawnSync("pnpm", args, { stdio: "inherit", env: process.env });

process.exit(result.status ?? 1);
