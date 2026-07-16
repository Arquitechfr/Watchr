import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "search_history";
const MAX_ENTRIES = 10;

interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function getStorage(): StorageAdapter {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    const ls = window.localStorage;
    return {
      getItem: (key: string) => Promise.resolve(ls.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(ls.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(ls.removeItem(key)),
    };
  }
  return AsyncStorage;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const storage = getStorage();
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          setHistory(Array.isArray(parsed) ? parsed : []);
        }
      } catch {
        // ignore parse errors
      }
    })();
  }, []);

  const addEntry = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setHistory((prev) => {
        const filtered = prev.filter((h) => h.toLowerCase() !== trimmed.toLowerCase());
        const next = [trimmed, ...filtered].slice(0, MAX_ENTRIES);

        getStorage().setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});

        return next;
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    getStorage().removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const removeEntry = useCallback(
    (entry: string) => {
      setHistory((prev) => {
        const next = prev.filter((h) => h !== entry);
        getStorage().setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  return { history, addEntry, clearHistory, removeEntry };
}
