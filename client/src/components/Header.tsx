import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Flower2, Menu, X, ChevronDown, Bell, MessageCircle, Package, Star, ChevronRight, LogOut, LayoutDashboard, ShoppingBag, Shield, Clock } from "lucide-react";
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

const ROLE_LABELS: Record<string, string> = {
  buyer: "Покупатель",
  shop: "Владелец магазина",
  admin: "Администратор",
};

const ROLE_COLORS: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  shop: "bg-primary/10 text-primary",
  admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

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

  const { data: myOrders } = useQuery<any[]>({
    queryKey: ["/api/orders/my"],
    enabled: !!user && user.role === "buyer",
  });

  const { data: shopOrders } = useQuery<any[]>({
    queryKey: ["/api/orders/shop"],
    enabled: !!user && user.role === "shop",
  });

  const notifications = notifData?.notifications || [];
  const unreadMessages = notifData?.unreadMessages || 0;

  const activeOrdersCount = (myOrders || []).filter(
    (o) => !["delivered", "cancelled"].includes(o.status)
  ).length;

  const pendingShopOrdersCount = (shopOrders || []).filter(
    (o) => o.status === "new"
  ).length;

  const assemblingCount = (shopOrders || []).filter(
    (o) => o.status === "assembling" && o.buyerPhotoApproval === "approved"
  ).length;

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
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <span className="hidden sm:block max-w-24 truncate">{user.name}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-0">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <span className={cn("inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", ROLE_COLORS[user.role])}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  {user.role === "buyer" && (
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full rounded-sm hover:bg-accent transition-colors" data-testid="link-account">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Мои заказы</p>
                          {activeOrdersCount > 0 && (
                            <p className="text-xs text-muted-foreground">{activeOrdersCount} активных</p>
                          )}
                        </div>
                        {activeOrdersCount > 0 && (
                          <Badge className="h-5 px-1.5 text-xs shrink-0">{activeOrdersCount}</Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {user.role === "shop" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/shop-dashboard" className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full rounded-sm hover:bg-accent transition-colors">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Панель магазина</p>
                            <p className="text-xs text-muted-foreground">Товары, аналитика</p>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/shop-dashboard?tab=orders" className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full rounded-sm hover:bg-accent transition-colors" data-testid="link-shop-orders">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Заказы</p>
                            {pendingShopOrdersCount > 0 && (
                              <p className="text-xs text-amber-600 font-medium">{pendingShopOrdersCount} новых</p>
                            )}
                            {assemblingCount > 0 && (
                              <p className="text-xs text-green-600 font-medium">{assemblingCount} одобрено покупателем</p>
                            )}
                            {pendingShopOrdersCount === 0 && assemblingCount === 0 && (
                              <p className="text-xs text-muted-foreground">Управление заказами</p>
                            )}
                          </div>
                          {(pendingShopOrdersCount + assemblingCount) > 0 && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-xs shrink-0">
                              {pendingShopOrdersCount + assemblingCount}
                            </Badge>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full rounded-sm hover:bg-accent transition-colors">
                        <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                          <Shield className="w-3.5 h-3.5 text-red-600 dark:text-red-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Администрирование</p>
                          <p className="text-xs text-muted-foreground">Управление платформой</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/chat" className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full rounded-sm hover:bg-accent transition-colors">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 relative">
                        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        {unreadMessages > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center">
                            {unreadMessages > 9 ? "9+" : unreadMessages}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Сообщения</p>
                        {unreadMessages > 0 ? (
                          <p className="text-xs text-primary font-medium">{unreadMessages} непрочитанных</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Чат с магазинами</p>
                        )}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-2 m-1 rounded-md text-destructive focus:text-destructive cursor-pointer"
                  data-testid="button-logout"
                >
                  <div className="w-7 h-7 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
                    <LogOut className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <span className="text-sm font-medium">Выйти из аккаунта</span>
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
