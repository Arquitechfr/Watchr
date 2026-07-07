import { describe, it, expect, vi } from "vitest";

vi.mock("../../services/auth.service", () => ({
  getMe: vi.fn(),
}));

vi.mock("../../store/authStore", () => ({
  useAuthStore: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock("../../store/themeStore", () => ({
  useThemeStore: vi.fn(() => ({ themePreference: "system", setThemePreference: vi.fn() })),
}));

import { computeThemeSyncUpdate } from "../useThemeSync";
import type { ThemePreference } from "../../store/themeStore";

describe("computeThemeSyncUpdate", () => {
  it("returns null when server preference is undefined", () => {
    expect(computeThemeSyncUpdate(undefined, "dark" as ThemePreference)).toBeNull();
  });

  it("returns null when server and local preferences are equal", () => {
    expect(computeThemeSyncUpdate("dark", "dark")).toBeNull();
    expect(computeThemeSyncUpdate("light", "light")).toBeNull();
    expect(computeThemeSyncUpdate("system", "system")).toBeNull();
  });

  it("returns server preference when it differs from local", () => {
    expect(computeThemeSyncUpdate("dark", "light")).toBe("dark");
    expect(computeThemeSyncUpdate("light", "dark")).toBe("light");
    expect(computeThemeSyncUpdate("system", "dark")).toBe("system");
    expect(computeThemeSyncUpdate("dark", "system")).toBe("dark");
  });

  it("regression: after a successful local change, synced cache should match local and produce no update", () => {
    const serverPref = "dark" as ThemePreference;
    const localPref = "dark" as ThemePreference;
    expect(computeThemeSyncUpdate(serverPref, localPref)).toBeNull();
  });
});
