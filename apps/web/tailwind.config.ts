import type { Config } from "tailwindcss";
import { createTailwindConfig } from "@spheresconnect/config/tailwind";

const contentGlobs: Config["content"] = [
  "./src/app/**/*.{ts,tsx}",
  "./src/components/**/*.{ts,tsx}",
  "./src/context/**/*.{ts,tsx}",
  "./src/hooks/**/*.{ts,tsx}",
  "./src/lib/**/*.{ts,tsx}",
  "./src/styles/**/*.{ts,tsx}",
  "../../packages/ui/src/**/*.{ts,tsx}"
];

export default createTailwindConfig(contentGlobs);
