import { useEffect, useState } from "react";
import { websocketService, WsConnectionState } from "../services/websocket.service";

export function useWebSocketEvent(
  event: string,
  callback: (...args: unknown[]) => void,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    const unsub = websocketService.on(event, callback);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useWsConnectionState(): WsConnectionState {
  const [state, setState] = useState<WsConnectionState>(
    websocketService.getConnectionState(),
  );

  useEffect(() => {
    return websocketService.onConnectionStateChange(setState);
  }, []);

  return state;
}
