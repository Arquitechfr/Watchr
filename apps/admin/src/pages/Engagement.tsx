import { useEffect, useState } from "react";
import { BarChart3, Mail, Bell, MousePointerClick, TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";

interface EngagementStats {
  pushTaps30d: number;
  emailOpens30d: number;
  emailClicks30d: number;
  pushReceived30d: number;
}

export function Engagement() {
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, configRes] = await Promise.all([
          api.get("/admin/engagement-stats"),
          api.get("/internal/mobile-config").catch(() => null),
        ]);
        setStats(statsRes.data);
        if (configRes?.data?.posthog_engagement_dashboard_url) {
          setDashboardUrl(configRes.data.posthog_engagement_dashboard_url);
        }
      } catch (err) {
        console.error("Failed to load engagement stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpiCards = [
    { label: "Push Taps (30d)", value: stats?.pushTaps30d, icon: Bell },
    { label: "Push Received (30d)", value: stats?.pushReceived30d, icon: BarChart3 },
    { label: "Email Opens (30d)", value: stats?.emailOpens30d, icon: Mail },
    { label: "Email Clicks (30d)", value: stats?.emailClicks30d, icon: MousePointerClick },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Engagement</h1>
          <p className="text-sm text-text-muted mt-1">Notification and email engagement tracking</p>
        </div>
        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 transition-colors"
          >
            <ExternalLink size={16} />
            Open in PostHog
          </a>
        )}
      </div>

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
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : dashboardUrl ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <CardTitle>PostHog Dashboard</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <iframe
              src={dashboardUrl}
              className="w-full border-0"
              style={{ minHeight: "600px" }}
              title="PostHog Engagement Dashboard"
              loading="lazy"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <CardTitle>PostHog Dashboard</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp size={48} className="text-text-muted mb-4" />
              <p className="text-text-muted mb-2">No dashboard URL configured</p>
              <p className="text-sm text-text-muted/60">
                Set <code className="rounded bg-surface-light px-1.5 py-0.5 text-xs">posthog_engagement_dashboard_url</code> in
                Remote Config to embed the PostHog dashboard here.
              </p>
              <a
                href="https://eu.posthog.com/project/223410/dashboard/839177"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 transition-colors"
              >
                <ExternalLink size={16} />
                Open PostHog Dashboard
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
