import { create } from "zustand";

export interface OnboardingSelectedItem {
  tmdbId: number;
  type: "tv" | "movie";
  title: string;
  posterPath?: string;
}

interface OnboardingState {
  selectedItems: OnboardingSelectedItem[];
  toggleItem: (item: OnboardingSelectedItem) => void;
  isSelected: (tmdbId: number) => boolean;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  selectedItems: [],
  toggleItem: (item) => {
    const exists = get().selectedItems.some((i) => i.tmdbId === item.tmdbId);
    if (exists) {
      set({
        selectedItems: get().selectedItems.filter((i) => i.tmdbId !== item.tmdbId),
      });
    } else {
      set({ selectedItems: [...get().selectedItems, item] });
    }
  },
  isSelected: (tmdbId) => get().selectedItems.some((i) => i.tmdbId === tmdbId),
  reset: () => set({ selectedItems: [] }),
}));
