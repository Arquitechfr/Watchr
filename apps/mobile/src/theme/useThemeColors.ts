import { useThemeContext } from "./ThemeProvider";

export function useThemeColors() {
  return useThemeContext().colors;
}
