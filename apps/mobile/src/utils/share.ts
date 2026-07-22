import { Platform, Share } from "react-native";
import { copyToClipboard } from "./clipboard";
import { useUIStore } from "../store/uiStore";

interface ShareOptions {
  message: string;
  url?: string;
  title?: string;
}

export async function shareContent(options: ShareOptions): Promise<void> {
  if (Platform.OS === "web") {
    const text = options.url
      ? `${options.message} ${options.url}`
      : options.message;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.message,
          url: options.url,
        });
        return;
      } catch {
        // user dismissed or navigator.share failed — fallback to clipboard
      }
    }
    await copyToClipboard(text);
    useUIStore.getState().showSnackbar("Copied to clipboard", "success");
    return;
  }
  await Share.share({ message: options.message, url: options.url, title: options.title });
}
