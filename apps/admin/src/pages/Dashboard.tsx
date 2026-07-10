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
import { Users, MessageSquare, Tv, Download, Bell, Shield } from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";

interface Stats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
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
    { label: "Total Comments", value: stats?.totalComments, icon: MessageSquare },
    { label: "Total Shows", value: stats?.totalShows, icon: Tv },
    { label: "Total Imports", value: stats?.totalImports, icon: Download },
    { label: "Active Push Tokens", value: stats?.activePushTokens, icon: Bell },
    { label: "Admins", value: stats?.totalAdmins, icon: Shield },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
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
    </div>
  );
}
