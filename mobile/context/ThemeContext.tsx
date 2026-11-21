import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { preferenceStorage, ThemePreference } from "@/lib/storage";

const palettes = {
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
interface ThemeContextValue {
  colors: AppColors;
  mode: "light" | "dark";
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

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
  const mode = preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;
  const value = useMemo(() => ({ colors: palettes[mode], mode, preference, setPreference }), [mode, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
