import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Tv, Heart, Star, Download } from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate } from "../lib/utils";

interface UserDetail {
  id: string;
  email: string;
  username: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  preferredLanguage?: string;
  themePreference: string;
  hasCompletedOnboarding: boolean;
  googleLinked: boolean;
  trackingCount: number;
  favoritesCount: number;
  ratingsCount: number;
  importJobsCount: number;
  recentComments: Array<{ id: string; content: string; showId: string; createdAt: string }>;
}

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/admin/users/${id}`);
        setUser(data);
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Skeleton height={32} className="mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={100} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <p>User not found</p>;

  const statCards = [
    { label: "Tracking", value: user.trackingCount, icon: Tv },
    { label: "Favorites", value: user.favoritesCount, icon: Heart },
    { label: "Ratings", value: user.ratingsCount, icon: Star },
    { label: "Import Jobs", value: user.importJobsCount, icon: Download },
    { label: "Comments", value: user.recentComments.length, icon: MessageSquare },
  ];

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate("/users")} className="mb-4">
        <ArrowLeft size={16} className="mr-2" /> Back to Users
      </Button>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-background">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-text-muted">{user.email}</p>
          <div className="flex gap-2 mt-1">
            <Badge className="bg-primary/20 text-primary">{user.role}</Badge>
            {user.googleLinked && (
              <Badge className="bg-surface-light text-text-muted">Google linked</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <stat.icon className="text-primary" size={20} />
              <div>
                <p className="text-xs text-text-muted">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Joined</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Last Login</span>
              <span>{formatDate(user.lastLoginAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Language</span>
              <span>{user.preferredLanguage ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Theme</span>
              <span>{user.themePreference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Onboarding</span>
              <span>{user.hasCompletedOnboarding ? "Completed" : "Pending"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.recentComments.length === 0 ? (
              <p className="text-sm text-text-muted">No comments</p>
            ) : (
              user.recentComments.map((comment) => (
                <div key={comment.id} className="border-b border-border pb-2 last:border-0">
                  <p className="text-sm line-clamp-2">{comment.content}</p>
                  <p className="text-xs text-text-muted mt-1">{formatDate(comment.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
