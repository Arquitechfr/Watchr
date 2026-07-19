import { Platform } from "react-native";

export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS === "web") {
    await navigator.clipboard.writeText(text);
    return;
  }
  const Clipboard = await import("expo-clipboard");
  await Clipboard.setStringAsync(text);
}
