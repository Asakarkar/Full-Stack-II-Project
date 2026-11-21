import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { preferenceStorage, ThemePreference } from "@/lib/storage";

export const palettes = {
  dark: {
    background: "#0C0D16",
    surface: "#151622",
    raised: "#202130",
    border: "#303142",
    text: "#F5F5FA",
    muted: "#9798AA",
    primary: "#8B83FF",
    primarySoft: "#27243F",
    accent: "#31C7A1",
    warning: "#F3B963",
    danger: "#FF7185",
    input: "#171824",
    tab: "#11121D",
  },
  light: {
    background: "#F8F9FC",
    surface: "#FFFFFF",
    raised: "#F0F2FA",
    border: "#E3E7F1",
    text: "#161C2D",
    muted: "#74809B",
    primary: "#635BFF",
    primarySoft: "#EFEDFF",
    accent: "#16A085",
    warning: "#C47B16",
    danger: "#D84B62",
    input: "#F7F8FC",
    tab: "#FFFFFF",
  },
};

export type AppColors = typeof palettes.dark;

export interface ThemeContextValue {
  colors: AppColors;
  mode: "light" | "dark";
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");

  useEffect(() => {
    preferenceStorage.getTheme().then((value) => {
      setPreferenceState(value);
    }).catch(() => undefined);
  }, []);

  const setPreference = useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);
    await preferenceStorage.setTheme(value);
  }, []);

  const setTheme = useCallback(async (value: ThemePreference) => {
    await setPreference(value);
  }, [setPreference]);

  const mode: "light" | "dark" = preference === "system"
    ? (systemScheme === "dark" ? "dark" : "light")
    : preference;

  const isDark = mode === "dark";

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemePreference = mode === "dark" ? "light" : "dark";
    await setPreference(nextMode);
  }, [mode, setPreference]);

  const value = useMemo(
    () => ({
      colors: palettes[mode],
      mode,
      isDark,
      preference,
      setPreference,
      setTheme,
      toggleTheme,
    }),
    [mode, isDark, preference, setPreference, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
