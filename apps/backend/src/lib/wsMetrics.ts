import { Registry, Counter, Gauge, Histogram } from "prom-client";

export const wsRegistry = new Registry();

export const wsMetrics = {
  connectionsTotal: new Counter({
    name: "ws_connections_total",
    help: "Total WebSocket connections",
    registers: [wsRegistry],
  }),
  disconnectionsTotal: new Counter({
    name: "ws_disconnections_total",
    help: "Total WebSocket disconnections",
    registers: [wsRegistry],
  }),
  eventsSentTotal: new Counter({
    name: "ws_events_sent_total",
    help: "Total WebSocket events sent to clients",
    labelNames: ["event"],
    registers: [wsRegistry],
  }),
  eventsReceivedTotal: new Counter({
    name: "ws_events_received_total",
    help: "Total WebSocket events received from clients",
    labelNames: ["event"],
    registers: [wsRegistry],
  }),
  connectedClients: new Gauge({
    name: "ws_connected_clients",
    help: "Currently connected WebSocket clients",
    registers: [wsRegistry],
  }),
  activeRooms: new Gauge({
    name: "ws_active_rooms",
    help: "Currently active WebSocket rooms",
    registers: [wsRegistry],
  }),
  eventLatency: new Histogram({
    name: "ws_event_latency_seconds",
    help: "WebSocket event processing latency",
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [wsRegistry],
  }),
};

export async function getMetrics(): Promise<string> {
  return wsRegistry.metrics();
}

export function getMetricsContentType(): string {
  return wsRegistry.contentType;
}
