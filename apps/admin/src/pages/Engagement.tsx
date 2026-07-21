import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Bell, Mail, MousePointerClick, BarChart3, TrendingUp, Loader2, Smartphone, MailOpen } from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";

interface DailyPoint {
  date: string;
  count: number;
}

interface EngagementData {
  totals: {
    pushTaps30d: number;
    pushReceived30d: number;
    emailOpens30d: number;
    emailClicks30d: number;
    emailSent30d: number;
  };
  series: {
    pushTaps: DailyPoint[];
    pushReceived: DailyPoint[];
    emailOpens: DailyPoint[];
    emailClicks: DailyPoint[];
  };
  rates: {
    pushTapRate: number;
    emailOpenRate: number;
    emailClickRate: number;
  };
}

function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Engagement() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/admin/engagement-stats");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load engagement stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpiCards = [
    { label: "Push Taps", value: data?.totals.pushTaps30d, icon: Bell, sub: "30 days" },
    { label: "Push Received", value: data?.totals.pushReceived30d, icon: Smartphone, sub: "30 days" },
    { label: "Email Opens", value: data?.totals.emailOpens30d, icon: MailOpen, sub: "30 days" },
    { label: "Email Clicks", value: data?.totals.emailClicks30d, icon: MousePointerClick, sub: "30 days" },
  ];

  const rateCards = [
    { label: "Push Tap Rate", value: data?.rates.pushTapRate, icon: TrendingUp },
    { label: "Email Open Rate", value: data?.rates.emailOpenRate, icon: Mail },
    { label: "Email Click Rate", value: data?.rates.emailClickRate, icon: MousePointerClick },
  ];

  const pushChartData = (() => {
    if (!data) return [];
    const map = new Map<string, { date: string; taps: number; received: number }>();
    for (const p of data.series.pushReceived) {
      map.set(formatDate(p.date), { date: formatDate(p.date), taps: 0, received: p.count });
    }
    for (const p of data.series.pushTaps) {
      const key = formatDate(p.date);
      const entry = map.get(key) ?? { date: key, taps: 0, received: 0 };
      entry.taps = p.count;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const emailChartData = (() => {
    if (!data) return [];
    const map = new Map<string, { date: string; opens: number; clicks: number }>();
    for (const p of data.series.emailOpens) {
      map.set(formatDate(p.date), { date: formatDate(p.date), opens: p.count, clicks: 0 });
    }
    for (const p of data.series.emailClicks) {
      const key = formatDate(p.date);
      const entry = map.get(key) ?? { date: key, opens: 0, clicks: 0 };
      entry.clicks = p.count;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const tooltipStyle = {
    backgroundColor: "var(--surface, #1A1614)",
    border: "1px solid var(--border, #332C24)",
    borderRadius: "8px",
    color: "var(--text, #F5F0EB)",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Engagement</h1>
        <p className="text-sm text-text-muted mt-1">Notification and email engagement tracking (last 30 days)</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-primary" />
                      <CardTitle className="text-sm">{card.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-text">{card.value ?? 0}</p>
                    <p className="text-xs text-text-muted mt-1">{card.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))
          : rateCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-primary" />
                      <CardTitle className="text-sm">{card.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-text">{(card.value ?? 0).toFixed(1)}%</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Push Notifications Chart */}
      {loading ? (
        <Card>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <CardTitle>Push Notifications — Received vs Tapped</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {pushChartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-text-muted">
                No push notification data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pushChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #332C24)" />
                  <XAxis dataKey="date" stroke="var(--text-muted, #888)" fontSize={12} />
                  <YAxis stroke="var(--text-muted, #888)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="received" name="Received" fill="#A84A2E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="taps" name="Tapped" fill="#C65D3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Engagement Chart */}
      {loading ? (
        <Card>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-primary" />
              <CardTitle>Email Engagement — Opens vs Clicks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {emailChartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-text-muted">
                No email engagement data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={emailChartData}>
                  <defs>
                    <linearGradient id="opensGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C65D3A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C65D3A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A84A2E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A84A2E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #332C24)" />
                  <XAxis dataKey="date" stroke="var(--text-muted, #888)" fontSize={12} />
                  <YAxis stroke="var(--text-muted, #888)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="opens" name="Opens" stroke="#C65D3A" strokeWidth={2} fill="url(#opensGradient)" />
                  <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#A84A2E" strokeWidth={2} fill="url(#clicksGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily breakdown tables */}
      {!loading && data && (data.series.pushTaps.length > 0 || data.series.emailOpens.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.series.pushTaps.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary" />
                  <CardTitle className="text-sm">Push Taps — Daily Breakdown</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {[...data.series.pushTaps].reverse().map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-text-muted">{formatDate(p.date)}</span>
                      <span className="font-medium text-text">{p.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {data.series.emailOpens.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MailOpen size={16} className="text-primary" />
                  <CardTitle className="text-sm">Email Opens — Daily Breakdown</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {[...data.series.emailOpens].reverse().map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-text-muted">{formatDate(p.date)}</span>
                      <span className="font-medium text-text">{p.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
