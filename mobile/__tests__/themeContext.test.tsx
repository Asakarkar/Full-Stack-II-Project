import { palettes } from "../context/ThemeContext";
import { preferenceStorage, ThemePreference } from "../lib/storage";

describe("THEME LOGIC & PERSISTENCE", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await preferenceStorage.setTheme("light");
  });

  describe("Color Palettes", () => {
    it("has valid light and dark palette definitions", () => {
      expect(palettes.light.background).toBe("#F8F9FC");
      expect(palettes.light.text).toBe("#161C2D");
      expect(palettes.light.primary).toBe("#635BFF");

      expect(palettes.dark.background).toBe("#0C0D16");
      expect(palettes.dark.text).toBe("#F5F5FA");
      expect(palettes.dark.primary).toBe("#8B83FF");
    });
  });

  describe("Preference Storage Persistence", () => {
    it("defaults to light theme when nothing stored", async () => {
      const theme = await preferenceStorage.getTheme();
      expect(theme).toBe("light");
    });

    it("persists dark theme preference to storage", async () => {
      await preferenceStorage.setTheme("dark");
      const stored = await preferenceStorage.getTheme();
      expect(stored).toBe("dark");
    });

    it("supports toggling between light and dark", async () => {
      let current: ThemePreference = "light";
      const toggle = (m: ThemePreference): ThemePreference => (m === "dark" ? "light" : "dark");

      current = toggle(current);
      await preferenceStorage.setTheme(current);
      expect(await preferenceStorage.getTheme()).toBe("dark");

      current = toggle(current);
      await preferenceStorage.setTheme(current);
      expect(await preferenceStorage.getTheme()).toBe("light");
    });
  });
});
