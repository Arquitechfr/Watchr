import { create } from "zustand";

interface UserNavigationState {
  userIds: string[];
  currentIndex: number;
  setUserList: (ids: string[], currentId: string) => void;
  nextUser: () => string | null;
  prevUser: () => string | null;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;
  clear: () => void;
}

export const useUserNavigationStore = create<UserNavigationState>((set, get) => ({
  userIds: [],
  currentIndex: -1,

  setUserList: (ids, currentId) => {
    const index = ids.indexOf(currentId);
    set({ userIds: ids, currentIndex: index });
  },

  nextUser: () => {
    const { userIds, currentIndex } = get();
    if (currentIndex < 0 || currentIndex >= userIds.length - 1) return null;
    const nextIndex = currentIndex + 1;
    set({ currentIndex: nextIndex });
    return userIds[nextIndex];
  },

  prevUser: () => {
    const { userIds, currentIndex } = get();
    if (currentIndex <= 0) return null;
    const prevIndex = currentIndex - 1;
    set({ currentIndex: prevIndex });
    return userIds[prevIndex];
  },

  canGoNext: () => {
    const { userIds, currentIndex } = get();
    return currentIndex >= 0 && currentIndex < userIds.length - 1;
  },

  canGoPrev: () => {
    const { userIds, currentIndex } = get();
    return currentIndex > 0;
  },

  clear: () => set({ userIds: [], currentIndex: -1 }),
}));
