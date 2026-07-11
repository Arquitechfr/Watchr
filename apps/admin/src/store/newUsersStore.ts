import { create } from "zustand";
import api from "../lib/api";

interface NewUsersState {
  count: number;
  loading: boolean;
  fetchCount: () => Promise<void>;
  markSeen: () => Promise<void>;
  setCount: (count: number) => void;
}

export const useNewUsersStore = create<NewUsersState>((set, get) => ({
  count: 0,
  loading: false,
  fetchCount: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/admin/users/new-count");
      set({ count: data.count, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  markSeen: async () => {
    set({ count: 0 });
    try {
      const { data } = await api.post("/admin/users/mark-seen");
      set({ count: data.newCount });
    } catch {
      get().fetchCount();
    }
  },
  setCount: (count) => set({ count }),
}));
