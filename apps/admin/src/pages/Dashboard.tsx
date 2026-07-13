import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, MessageSquare, Tv, Download, Bell, Shield, Sparkles, AlertTriangle, Send, Loader2, X, Zap } from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { Dialog } from "../components/ui/Dialog";

interface Stats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  newUsersSinceLastVisit: number;
  totalComments: number;
  totalShows: number;
  totalImports: number;
  activePushTokens: number;
  totalAdmins: number;
}

interface GrowthData {
  userGrowth: { date: string; count: number }[];
  commentActivity: { date: string; count: number }[];
  showBreakdown: { type: string; count: number }[];
}

const PIE_COLORS = ["#C65D3A", "#A84A2E", "#332C24"];

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  const [reengagementSending, setReengagementSending] = useState(false);
  const [reengagementResult, setReengagementResult] = useState("");
  const [nudgeSending, setNudgeSending] = useState(false);
  const [nudgeResult, setNudgeResult] = useState("");
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);
  const [anomalies, setAnomalies] = useState<Array<{ userId: string; username: string; type: string; severity: string; description: string }>>([]);
  const [anomaliesOpen, setAnomaliesOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, growthRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/stats/growth"),
        ]);
        setStats(statsRes.data);
        setGrowth(growthRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpiCards = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users },
    { label: "New Users (7d)", value: stats?.newUsers7d, icon: Users },
    { label: "New since last visit", value: stats?.newUsersSinceLastVisit, icon: Sparkles },
    { label: "Total Comments", value: stats?.totalComments, icon: MessageSquare },
    { label: "Total Shows", value: stats?.totalShows, icon: Tv },
    { label: "Total Imports", value: stats?.totalImports, icon: Download },
    { label: "Active Push Tokens", value: stats?.activePushTokens, icon: Bell },
    { label: "Admins", value: stats?.totalAdmins, icon: Shield },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-center gap-3">
              <kpi.icon className="text-primary" size={20} />
              <div>
                <p className="text-xs text-text-muted">{kpi.label}</p>
                {loading ? (
                  <Skeleton width={40} height={20} />
                ) : (
                  <p className="text-xl font-bold">{kpi.value ?? 0}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Growth (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={growth?.userGrowth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comment Activity (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={growth?.commentActivity ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary-dark)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Show Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={growth?.showBreakdown ?? []}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.type}: ${entry.count}`}
                  >
                    {(growth?.showBreakdown ?? []).map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              <CardTitle>AI Re-engagement</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4">
              Send personalized AI-generated push notifications to inactive users to bring them back to the app.
            </p>
            <Button
              onClick={async () => {
                setReengagementSending(true);
                setReengagementResult("");
                try {
                  await api.post("/admin/ai/reengagement");
                  setReengagementResult("Re-engagement batch started successfully");
                } catch (err) {
                  setReengagementResult("Failed to start re-engagement batch");
                  console.error("Re-engagement failed:", err);
                } finally {
                  setReengagementSending(false);
                }
              }}
              disabled={reengagementSending}
            >
              {reengagementSending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
              Trigger Re-engagement Batch
            </Button>
            {reengagementResult && (
              <p className="mt-3 text-sm text-primary">{reengagementResult}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="text-primary" size={20} />
              <CardTitle>Activation Nudge</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4">
              Send a static push notification to users who signed up 24-72h ago, completed onboarding, but haven't added any shows yet.
            </p>
            <Button
              onClick={async () => {
                setNudgeSending(true);
                setNudgeResult("");
                try {
                  await api.post("/admin/ai/activation-nudge");
                  setNudgeResult("Activation nudge batch started successfully");
                } catch (err) {
                  setNudgeResult("Failed to start activation nudge batch");
                  console.error("Activation nudge failed:", err);
                } finally {
                  setNudgeSending(false);
                }
              }}
              disabled={nudgeSending}
            >
              {nudgeSending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
              Trigger Activation Nudge Batch
            </Button>
            {nudgeResult && (
              <p className="mt-3 text-sm text-primary">{nudgeResult}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-primary" size={20} />
              <CardTitle>Anomaly Detection</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4">
              Detect suspicious user behavior: comment spam, rating bombing, mass tracking, and other anomalies.
            </p>
            <Button
              onClick={async () => {
                setAnomaliesLoading(true);
                try {
                  const { data } = await api.get("/admin/ai/anomalies");
                  setAnomalies(data.alerts || []);
                  setAnomaliesOpen(true);
                } catch (err) {
                  console.error("Anomaly detection failed:", err);
                } finally {
                  setAnomaliesLoading(false);
                }
              }}
              disabled={anomaliesLoading}
            >
              {anomaliesLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <AlertTriangle size={16} className="mr-2" />}
              Detect Anomalies
            </Button>
          </CardContent>
        </Card>
      </div>

      {anomaliesOpen && (
        <Dialog open onClose={() => setAnomaliesOpen(false)}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-primary" size={20} />
              <h2 className="text-lg font-bold">Detected Anomalies ({anomalies.length})</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setAnomaliesOpen(false)}>
              <X size={18} />
            </Button>
          </div>
          {anomalies.length === 0 ? (
            <p className="text-text-muted py-4">No anomalies detected. All clear!</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {anomalies.map((alert, index) => (
                <div key={index} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text">{alert.username || alert.userId}</span>
                    <Badge className={
                      alert.severity === "high" ? "bg-red-500/20 text-red-400" :
                      alert.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-blue-500/20 text-blue-400"
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-muted">
                    <span className="font-medium text-text">{alert.type}</span> — {alert.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
