import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import type { Locale } from "@/lib/types";
import type { TranslationKey, Translator } from "@/lib/landing-copy";
import { buildLandingHeroCopy } from "@/lib/landing-copy";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  en: en as Record<TranslationKey, string>,
  fr: fr as Record<TranslationKey, string>,
  es: es as Record<TranslationKey, string>
};

const locales: Locale[] = ["en", "fr", "es"];

const translatorFor = (locale: Locale): Translator => {
  return (key: TranslationKey) => {
    const value = dictionaries[locale][key];
    if (value === undefined) {
      throw new Error(`Missing translation for ${key} in ${locale}`);
    }
    return value;
  };
};

const prefixes = ["messages", "matcher", "marketplace", "profiles"] as const;

describe("language smoke test", () => {
  prefixes.forEach((prefix) => {
    it(`switches ${prefix} hero copy when locale changes`, () => {
      const heroByLocale = locales.map((locale) => ({
        locale,
        hero: buildLandingHeroCopy(translatorFor(locale), prefix)
      }));

      heroByLocale.forEach(({ locale, hero }) => {
        const expectedTitle = dictionaries[locale][`${prefix}_landing_title` as TranslationKey];
        expect(hero.heroTitle).toBe(expectedTitle);
      });

      const distinctTitles = new Set(heroByLocale.map(({ hero }) => hero.heroTitle));
      expect(distinctTitles.size).toBeGreaterThan(1);
    });
  });
});
