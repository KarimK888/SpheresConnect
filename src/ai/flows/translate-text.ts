interface TranslateInput {
  text: string;
  targetLang: "en" | "fr" | "es";
}

const detectLanguage = (text: string): "en" | "fr" | "es" => {
  if (/\b(le|la|des|que)\b/i.test(text)) return "fr";
  if (/\b(el|la|que|para)\b/i.test(text)) return "es";
  return "en";
};

export const translateTextFlow = async ({ text, targetLang }: TranslateInput) => {
  const sourceLang = detectLanguage(text);
  if (sourceLang === targetLang) {
    return { text, sourceLang };
  }
  // Placeholder translation stub
  return { text: `[${targetLang}] ${text}`, sourceLang };
};
