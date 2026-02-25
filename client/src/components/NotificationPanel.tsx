import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bell, MessageCircle, Package, Star, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "message" | "order" | "review";
  title: string;
  text: string;
  link: string;
  time: string;
}

interface NotificationsData {
  notifications: Notification[];
  unreadMessages: number;
}

const ICON_MAP: Record<string, typeof MessageCircle> = {
  message: MessageCircle,
  order: Package,
  review: Star,
};

const COLOR_MAP: Record<string, string> = {
  message: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
  order: "bg-primary/10 text-primary",
  review: "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчера";
  return `${days} дн назад`;
}

export function NotificationPanel() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery<NotificationsData>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (!user || dismissed) return null;

  const notifications = data?.notifications || [];
  if (notifications.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="panel-notifications">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Уведомления</h3>
            <Badge variant="secondary" className="text-xs">{notifications.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setDismissed(true)}
            data-testid="button-dismiss-notifications"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {notifications.slice(0, 5).map((n) => {
            const Icon = ICON_MAP[n.type] || Bell;
            return (
              <Link key={n.id} href={n.link}>
                <div
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
                  data-testid={`notification-${n.id}`}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", COLOR_MAP[n.type])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{n.text}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">{timeAgo(n.time)}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            );
          })}
          {notifications.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              и ещё {notifications.length - 5} уведомлений
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
