import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "rankforge.jwt";
const TOKEN_TYPE_KEY = "rankforge.tokenType";
const THEME_KEY = "rankforge.theme";
let browserToken: string | null = null;
let browserTokenType: string | null = null;

export const tokenStorage = {
  get: () => Platform.OS === "web" ? Promise.resolve(browserToken) : SecureStore.getItemAsync(TOKEN_KEY),
  getType: () => Platform.OS === "web" ? Promise.resolve(browserTokenType) : SecureStore.getItemAsync(TOKEN_TYPE_KEY),
  set: async (token: string, tokenType = "Bearer") => {
    if (Platform.OS === "web") {
      browserToken = token;
      browserTokenType = tokenType;
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(TOKEN_TYPE_KEY, tokenType);
  },
  clear: async () => {
    if (Platform.OS === "web") {
      browserToken = null;
      browserTokenType = null;
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_TYPE_KEY);
  },
};

export type ThemePreference = "system" | "light" | "dark";

export const preferenceStorage = {
  getTheme: async (): Promise<ThemePreference> => {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
  },
  setTheme: (theme: ThemePreference) => AsyncStorage.setItem(THEME_KEY, theme),
};
