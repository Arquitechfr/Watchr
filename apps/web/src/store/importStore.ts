import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ImportState {
  activeJobId: string | null;
  setActiveJobId: (jobId: string | null) => void;
  clearActiveJob: () => void;
}

export const useImportStore = create<ImportState>()(
  persist(
    (set) => ({
      activeJobId: null,
      setActiveJobId: (jobId) => set({ activeJobId: jobId }),
      clearActiveJob: () => set({ activeJobId: null }),
    }),
    {
      name: "watchr-import",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
