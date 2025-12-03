"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeStoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const useThemeStore = create<ThemeStoreState>((set) => ({
  theme: "dark",
  setTheme: (theme) => set({ theme })
}));

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({
  attribute,
  defaultTheme,
  children
}: {
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  children: React.ReactNode;
}) => {
  const theme = useThemeStore((state) => state.theme);
  const setThemeStore = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("spheraconnect-theme") as Theme | null;
    if (storedTheme) {
      setThemeStore(storedTheme);
    } else if (defaultTheme) {
      setThemeStore(defaultTheme);
    }
  }, [defaultTheme, setThemeStore]);

  useEffect(() => {
    const root = document.documentElement;
    if (attribute === "class") {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    } else {
      root.setAttribute(attribute ?? "data-theme", theme);
    }
    window.localStorage.setItem("spheraconnect-theme", theme);
  }, [theme, attribute]);

  const setTheme = useCallback(
    (value: Theme) => {
      setThemeStore(value);
    },
    [setThemeStore]
  );

  const toggleTheme = useCallback(() => {
    setThemeStore(theme === "dark" ? "light" : "dark");
  }, [setThemeStore, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const useThemeState = useThemeStore;
