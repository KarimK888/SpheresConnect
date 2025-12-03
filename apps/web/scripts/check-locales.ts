import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Locale = "en" | "fr" | "es";
const locales: Locale[] = ["en", "fr", "es"];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localeDir = path.resolve(__dirname, "../src/locales");

const dictionaries = locales.map((locale) => ({
  locale,
  content: JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), "utf-8")) as Record<string, unknown>
}));

const [reference, ...others] = dictionaries;
const missing: Record<string, string[]> = {};
const extra: Record<string, string[]> = {};

const referenceKeys = new Set(Object.keys(reference.content));

for (const dict of dictionaries) {
  for (const key of Object.keys(dict.content)) {
    if (!referenceKeys.has(key)) {
      extra[key] ??= [];
      extra[key].push(dict.locale);
    }
  }
}

for (const locale of others) {
  for (const key of referenceKeys) {
    if (!(key in locale.content)) {
      missing[key] ??= [];
      missing[key].push(locale.locale);
    }
  }
}

if (!Object.keys(missing).length && !Object.keys(extra).length) {
  console.log("Locale dictionaries are in sync");
  process.exit(0);
}

if (Object.keys(missing).length) {
  console.error("Missing keys:");
  for (const [key, locales] of Object.entries(missing)) {
    console.error(`  ${key}: ${locales.join(", ")}`);
  }
}

if (Object.keys(extra).length) {
  console.error("Extra keys (not present in reference):");
  for (const [key, locales] of Object.entries(extra)) {
    console.error(`  ${key}: ${locales.join(", ")}`);
  }
}

process.exit(1);
