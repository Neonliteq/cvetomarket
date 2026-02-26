import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Flower2, Menu, X, ChevronDown, Bell, MessageCircle, Package, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

export function Header() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData } = useQuery<NotificationsData>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications || [];

  const navLinks = [
    { href: "/", label: "Главная" },
    { href: "/catalog", label: "Каталог" },
    { href: "/shops", label: "Магазины" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Flower2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg hidden sm:block">ЦветоМаркет</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(location === l.href && "bg-accent text-accent-foreground")}
              >
                {l.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0" data-testid="panel-notifications">
                <div className="p-3 border-b flex items-center justify-between">
                  <p className="text-sm font-semibold">Уведомления</p>
                  {notifications.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{notifications.length}</Badge>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Нет новых уведомлений
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.slice(0, 8).map((n) => {
                      const Icon = ICON_MAP[n.type] || Bell;
                      return (
                        <Link key={n.id} href={n.link} onClick={() => setNotifOpen(false)}>
                          <div
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer group border-b last:border-b-0"
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
                              <span className="text-[10px] text-muted-foreground">{timeAgo(n.time)}</span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                    {notifications.length > 8 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        и ещё {notifications.length - 8}
                      </p>
                    )}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative" data-testid="button-cart">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-user-menu">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block max-w-24 truncate">{user.name}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user.role === "buyer" && (
                  <DropdownMenuItem asChild>
                    <Link href="/account">Мои заказы</Link>
                  </DropdownMenuItem>
                )}
                {user.role === "shop" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/shop-dashboard">Панель магазина</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/shop-dashboard?tab=orders" data-testid="link-shop-orders">Заказы</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Администрирование</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/chat">Сообщения</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button size="sm" data-testid="button-login">Войти</Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={cn("w-full justify-start", location === l.href && "bg-accent")}
              >
                {l.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
