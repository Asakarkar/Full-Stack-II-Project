import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "rankforge.jwt";
const TOKEN_TYPE_KEY = "rankforge.tokenType";
const THEME_KEY = "rankforge.theme";

// In-memory fallback for web and non-native test environments
let memoryToken: string | null = null;
let memoryTokenType: string | null = null;
let memoryTheme: string | null = null;

export const tokenStorage = {
  get: async (): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        return memoryToken;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  },

  getType: async (): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        return memoryTokenType;
      }
      return await SecureStore.getItemAsync(TOKEN_TYPE_KEY);
    } catch {
      return memoryTokenType;
    }
  },

  set: async (token: string, tokenType = "Bearer"): Promise<void> => {
    memoryToken = token;
    memoryTokenType = tokenType;
    try {
      if (Platform.OS !== "web") {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(TOKEN_TYPE_KEY, tokenType);
      }
    } catch {
      // Fallback kept in memory
    }
  },

  clear: async (): Promise<void> => {
    memoryToken = null;
    memoryTokenType = null;
    try {
      if (Platform.OS !== "web") {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(TOKEN_TYPE_KEY);
      }
    } catch {
      // Fallback cleared in memory
    }
  },
};

export type ThemePreference = "system" | "light" | "dark";

export const preferenceStorage = {
  getTheme: async (): Promise<ThemePreference> => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
      return memoryTheme === "light" || memoryTheme === "dark" || memoryTheme === "system" ? memoryTheme : "light";
    } catch {
      return memoryTheme === "light" || memoryTheme === "dark" || memoryTheme === "system" ? memoryTheme : "light";
    }
  },

  setTheme: async (theme: ThemePreference): Promise<void> => {
    memoryTheme = theme;
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch {
      // Fallback kept in memory
    }
  },
};
