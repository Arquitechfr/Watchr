import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ImportState {
  activeJobId: string | null;
  isHydrated: boolean;
  setActiveJobId: (jobId: string | null) => void;
  clearActiveJob: () => void;
  hydrate: () => Promise<void>;
}

export const useImportStore = create<ImportState>()(
  persist(
    (set) => ({
      activeJobId: null,
      isHydrated: false,
      setActiveJobId: (jobId) => set({ activeJobId: jobId }),
      clearActiveJob: () => set({ activeJobId: null }),
      hydrate: async () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: "watchr-import",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.isHydrated = true;
      },
    },
  ),
);
