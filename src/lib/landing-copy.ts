import en from "@/locales/en.json";

export type TranslationKey = keyof typeof en;
export type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

const prefixedKey = (prefix: string, suffix: string) => `${prefix}_${suffix}` as TranslationKey;

export const buildLandingHeroCopy = (t: Translator, prefix: string) => ({
  heroTag: t(prefixedKey(prefix, "landing_tag")),
  heroBadge: t(prefixedKey(prefix, "landing_badge")),
  heroTitle: t(prefixedKey(prefix, "landing_title")),
  heroDescription: t(prefixedKey(prefix, "landing_description")),
  primaryCtaAuthed: t(prefixedKey(prefix, "primary_cta_authed")),
  primaryCtaGuest: t(prefixedKey(prefix, "primary_cta_guest")),
  secondaryCta: t(prefixedKey(prefix, "secondary_cta"))
});

export const buildLandingPreviewCopy = (t: Translator, prefix: string) => ({
  previewBadge: t(prefixedKey(prefix, "preview_badge")),
  previewHeading: t(prefixedKey(prefix, "preview_heading")),
  previewBody: t(prefixedKey(prefix, "preview_body")),
  previewSecondary: t(prefixedKey(prefix, "preview_secondary"))
});

type TranslationMapping<Base> = Record<string, keyof Base>;

/**
 * Maps an array of base config objects that contain translation key properties into
 * translated copies while keeping the non-translation fields intact.
 */
export const translateCollection = <
  Base extends Record<string, unknown>,
  Mapping extends TranslationMapping<Base>
>(
  items: readonly Base[],
  mapping: Mapping,
  t: Translator
) => {
  return items.map((item) => {
    const result: Record<string, unknown> = { ...item };
    Object.entries(mapping).forEach(([target, sourceKey]) => {
      const translationKey = item[sourceKey];
      result[target] = t(translationKey as TranslationKey);
      delete result[sourceKey as string];
    });
    return result as Omit<Base, Mapping[keyof Mapping]> & { [K in keyof Mapping]: string };
  });
};

export const translateKeyList = (keys: readonly TranslationKey[], t: Translator) => keys.map((key) => t(key));
