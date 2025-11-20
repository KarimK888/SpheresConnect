"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import { create } from "zustand";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import es from "../locales/es.json";
import type { Locale } from "../lib/types";

type Messages = typeof en;

type InterpolationValues = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  t: <Key extends keyof Messages>(key: Key, params?: InterpolationValues) => string;
  setLocale: (locale: Locale) => void;
}

interface I18nStoreState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const dictionaries: Record<Locale, Messages> = {
  en,
  fr,
  es
};

const useI18nStore = create<I18nStoreState>((set) => ({
  locale: ((process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale) || "en") as Locale,
  setLocale: (locale) => set({ locale })
}));

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const locale = useI18nStore((state) => state.locale);
  const setLocaleStore = useI18nStore((state) => state.setLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem("spheraconnect-locale") as Locale | null;
    if (stored && dictionaries[stored]) {
      setLocaleStore(stored);
    }
  }, [setLocaleStore]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback(
    (value: Locale) => {
      if (!dictionaries[value]) return;
      setLocaleStore(value);
      window.localStorage.setItem("spheraconnect-locale", value);
    },
    [setLocaleStore]
  );

  const t = useCallback<
    <Key extends keyof Messages>(key: Key, params?: InterpolationValues) => string
  >(
    (key, params) => {
      const dict = dictionaries[locale] ?? dictionaries.en;
      const template = dict[key] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, token) =>
        Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : match
      );
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      t,
      setLocale
    }),
    [locale, t, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};

export const useI18nState = useI18nStore;
