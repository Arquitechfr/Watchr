import { EventEmitter } from "events";

export interface WsEventMap {
  "import:progress": { userId: string; jobId: string; status: string; progress: unknown };
  "comment:created": { showId: string; comment: unknown };
  "comment:updated": { showId: string; comment: unknown };
  "comment:deleted": { showId: string; commentId: string };
  "comment:liked": { showId: string; commentId: string; likesCount: number };
  "comment:reaction": { showId: string; commentId: string; reactions: unknown };
  "notification:new": { userId: string; notification: unknown };
  "tracking:updated": { userId: string; showId: string };
  "upcoming:updated": { userIds: string[] };
  "show:updated": { showId: string; updatedAt: string; changedFields?: string[] };
  "news:new": { articles: unknown[] };
}

export type WsEventName = keyof WsEventMap;
export type WsEventData<K extends WsEventName> = WsEventMap[K];

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export const wsEvents = {
  emit<K extends WsEventName>(event: K, data: WsEventData<K>): void {
    emitter.emit(event, data);
  },
  on<K extends WsEventName>(event: K, listener: (data: WsEventData<K>) => void): void {
    emitter.on(event, listener);
  },
  off<K extends WsEventName>(event: K, listener: (data: WsEventData<K>) => void): void {
    emitter.off(event, listener);
  },
  removeAllListeners(): void {
    emitter.removeAllListeners();
  },
};
