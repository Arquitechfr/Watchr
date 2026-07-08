import { useState, useEffect } from "react";
import { websocketService, type WsConnectionState } from "../services/websocket.service";

export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<WsConnectionState>(
    websocketService.getConnectionState(),
  );

  useEffect(() => {
    const unsub = websocketService.onConnectionStateChange((state) => {
      setConnectionState(state);
    });
    return unsub;
  }, []);

  return connectionState;
}
