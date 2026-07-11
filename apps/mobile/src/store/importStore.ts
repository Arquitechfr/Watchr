import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ImportState {
  activeJobId: string | null;
  isHydrated: boolean;
  isBannerCollapsed: boolean;
  isBannerDismissed: boolean;
  setActiveJobId: (jobId: string | null) => void;
  clearActiveJob: () => void;
  setBannerCollapsed: (v: boolean) => void;
  dismissBanner: () => void;
  hydrate: () => Promise<void>;
}

export const useImportStore = create<ImportState>()(
  persist(
    (set) => ({
      activeJobId: null,
      isHydrated: false,
      isBannerCollapsed: false,
      isBannerDismissed: false,
      setActiveJobId: (jobId) =>
        set({ activeJobId: jobId, isBannerCollapsed: false, isBannerDismissed: false }),
      clearActiveJob: () => set({ activeJobId: null }),
      setBannerCollapsed: (v) => set({ isBannerCollapsed: v }),
      dismissBanner: () => set({ isBannerDismissed: true, activeJobId: null }),
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
