import { useState, useEffect, type ComponentType } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MessageCircle, User, LogOut, Star, CheckCircle, Upload, Camera, X, MapPin, ShoppingBag, TrendingUp, Store, Flower2, Activity, Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractiveStarRating, StarRating } from "@/components/StarRating";
import { RUSSIAN_CITIES } from "@/lib/russianCities";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order, OrderItem, Review } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type OrderWithItems = Order & {
  items?: (OrderItem & { productName?: string; productImage?: string })[];
  shopName?: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  assembling: "Собирается",
  delivering: "Доставка",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  new: "secondary",
  confirmed: "default",
  assembling: "default",
  delivering: "default",
  delivered: "default",
  cancelled: "destructive",
};

type StatItem = { label: string; value: string; icon: ComponentType<{ className?: string }>; color: string; truncate?: boolean };

function BuyerStats({ orders }: { orders: OrderWithItems[] }) {
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === "delivered");
  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const totalSpent = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const avgCheck = deliveredOrders.length > 0 ? totalSpent / deliveredOrders.length : 0;

  const shopCounts: Record<string, number> = {};
  orders.forEach(o => {
    const name = o.shopName || "—";
    shopCounts[name] = (shopCounts[name] || 0) + 1;
  });
  const favoriteShop = Object.entries(shopCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const productCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items?.forEach(item => {
      const name = item.productName || "—";
      productCounts[name] = (productCounts[name] || 0) + 1;
    });
  });
  const favoriteProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const stats: StatItem[] = [
    { label: "Всего заказов", value: totalOrders.toString(), icon: ShoppingBag, color: "text-primary" },
    { label: "Завершённых", value: deliveredOrders.length.toString(), icon: CheckCircle, color: "text-green-600" },
    { label: "Активных", value: activeOrders.length.toString(), icon: Activity, color: "text-blue-600" },
    { label: "Потрачено", value: `${totalSpent.toLocaleString("ru-RU")} ₽`, icon: TrendingUp, color: "text-amber-600" },
    { label: "Средний чек", value: avgCheck > 0 ? `${Math.round(avgCheck).toLocaleString("ru-RU")} ₽` : "—", icon: TrendingUp, color: "text-orange-600" },
    { label: "Любимый магазин", value: favoriteShop, icon: Store, color: "text-violet-600", truncate: true },
    { label: "Любимый товар", value: favoriteProduct, icon: Flower2, color: "text-pink-600", truncate: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" data-testid="buyer-stats">
      {stats.map((s) => (
        <Card key={s.label} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color} shrink-0`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-lg font-bold ${s.truncate ? "truncate" : ""}`} title={s.value} data-testid={`stat-${s.label}`}>
              {s.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductReviewDialog({ order, item, alreadyReviewed }: { 
  order: OrderWithItems; 
  item: OrderItem & { productName?: string; productImage?: string };
  alreadyReviewed?: Review;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reviews", {
      orderId: order.id,
      shopId: order.shopId,
      productId: item.productId,
      rating,
      comment,
    }),
    onSuccess: () => {
      toast({ title: "Оценка товара отправлена!" });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", item.productId, "reviews"] });
      setOpen(false);
    },
    onError: (err: any) => toast({ title: err?.message || "Ошибка", variant: "destructive" }),
  });

  if (alreadyReviewed) {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <StarRating rating={alreadyReviewed.rating} size="sm" />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-1" data-testid={`button-review-product-${item.productId}`}>
          <Star className="w-3 h-3" /> Оценить
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оценить товар</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
              <img src={item.productImage || "/images/placeholder-bouquet.png"} alt={item.productName} className="w-full h-full object-cover" />
            </div>
            <p className="font-medium text-sm">{item.productName}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Ваша оценка</p>
            <InteractiveStarRating value={rating} onChange={setRating} />
            <p className="text-xs text-muted-foreground">
              {rating === 1 && "Очень плохо"}
              {rating === 2 && "Плохо"}
              {rating === 3 && "Нормально"}
              {rating === 4 && "Хорошо"}
              {rating === 5 && "Отлично"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Комментарий (необязательно)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Что понравилось, качество букета..."
              data-testid="input-product-review-comment"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="button-submit-product-review"
          >
            {mutation.isPending ? "Отправляем..." : "Отправить оценку"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ order }: { order: OrderWithItems }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reviews", {
      orderId: order.id,
      shopId: order.shopId,
      rating,
      comment,
    }),
    onSuccess: () => {
      toast({ title: "Отзыв отправлен!", description: "Спасибо за вашу оценку!" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shops", order.shopId, "reviews"] });
      setOpen(false);
    },
    onError: (err: any) => toast({ title: err?.message || "Ошибка", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid={`button-review-${order.id}`}>
          <Star className="w-3.5 h-3.5" /> Оставить отзыв о магазине
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оценить магазин{order.shopName ? ` «${order.shopName}»` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Оцените качество обслуживания и доставки по пятибалльной шкале
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Ваша оценка</p>
            <InteractiveStarRating value={rating} onChange={setRating} />
            <p className="text-xs text-muted-foreground">
              {rating === 1 && "Очень плохо"}
              {rating === 2 && "Плохо"}
              {rating === 3 && "Нормально"}
              {rating === 4 && "Хорошо"}
              {rating === 5 && "Отлично"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Комментарий (необязательно)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите, как прошла доставка, качество букета..."
              data-testid="input-review-comment"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="button-submit-review"
          >
            {mutation.isPending ? "Отправляем..." : "Отправить отзыв"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TelegramSection({ user, queryClient, toast }: { user: any; queryClient: any; toast: any }) {
  const isConnected = !!(user as any).telegramChatId;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/telegram/link");
      return res as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => toast({ title: "Ошибка", description: "Не удалось получить ссылку", variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/telegram/link"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Telegram отключён" });
    },
  });

  return (
    <div>
      <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
        <Send className="w-4 h-4 text-blue-500" /> Telegram-уведомления
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Получайте уведомления о заказах, фото и сообщениях прямо в Telegram
      </p>

      {isConnected ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Telegram подключён</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            data-testid="button-telegram-disconnect"
          >
            Отключить
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
          data-testid="button-telegram-connect"
        >
          <ExternalLink className="w-4 h-4" />
          {connectMutation.isPending ? "Открываем..." : "Подключить Telegram"}
        </Button>
      )}
    </div>
  );
}

export default function Account() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/my"],
    enabled: !!user,
  });

  const { data: myReviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews/my"],
    enabled: !!user,
  });

  const photoApprovalMutation = useMutation({
    mutationFn: ({ id, approval }: { id: string; approval: "approved" | "rejected" }) =>
      apiRequest("PATCH", `/api/orders/${id}/photo-approval`, { approval }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] }),
    onError: (err: any) => toast({ title: "Ошибка", description: err.message, variant: "destructive" }),
  });

  const shopReviewedShopIds = new Set((myReviews || []).filter((r) => !r.productId).map((r) => r.shopId));
  const productReviewMap = new Map<string, Review>();
  (myReviews || []).filter((r) => r.productId).forEach((r) => {
    productReviewMap.set(`${r.orderId}_${r.productId}`, r);
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Аватар" className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <User className="w-6 h-6 text-primary" />
              </div>
            )}
            <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="input-upload-avatar"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("images", file);
                  const resp = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
                  const data = await resp.json();
                  if (data.urls?.[0]) {
                    await apiRequest("PATCH", "/api/auth/profile", { avatarUrl: data.urls[0] });
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                    toast({ title: "Аватар обновлён" });
                  }
                }}
              />
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Личный кабинет</h1>
            <p className="text-muted-foreground">{user.name} · {user.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
          <LogOut className="w-4 h-4" /> Выйти
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders" className="gap-1.5">
            <Package className="w-4 h-4" /> Мои заказы
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="w-4 h-4" /> Профиль
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {ordersLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 7 }).map((_, i) => <Skeleton key={`stat-${i}`} className="h-20 rounded-lg" />)}
              </div>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
            </div>
          ) : orders?.length ? (
            <div className="space-y-4">
              <BuyerStats orders={orders} />
              {orders.map((order) => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">Заказ #{order.id.slice(0, 8).toUpperCase()}</p>
                          <Badge variant={(STATUS_COLORS[order.status] || "secondary") as any}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </div>
                        {order.shopName && <p className="text-xs text-muted-foreground mt-0.5">{order.shopName}</p>}
                        {order.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</p>
                        <p className="text-xs text-muted-foreground">
                          {order.deliveryDate} {order.deliveryTime}
                        </p>
                      </div>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                              <img
                                src={item.productImage || "/images/placeholder-bouquet.png"}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                            </div>
                            {order.status === "delivered" && item.productId && (
                              <div className="shrink-0">
                                <ProductReviewDialog
                                  order={order}
                                  item={item}
                                  alreadyReviewed={productReviewMap.get(`${order.id}_${item.productId}`)}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {order.assemblyPhotoUrl && ["assembling", "delivering", "delivered"].includes(order.status) && (
                      <div className="mb-3 rounded-lg border border-border overflow-hidden">
                        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" />
                            Фото готового букета
                          </p>
                          {order.status === "assembling" && order.buyerPhotoApproval === "pending" && (
                            <span className="text-xs text-amber-600 font-medium">Ожидает вашей оценки</span>
                          )}
                          {order.buyerPhotoApproval === "approved" && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Одобрено вами
                            </span>
                          )}
                        </div>
                        <img
                          src={order.assemblyPhotoUrl}
                          alt="Фото готового букета"
                          className="w-full max-h-72 object-cover"
                          data-testid={`img-assembly-photo-${order.id}`}
                        />
                        {order.status === "assembling" && order.buyerPhotoApproval === "pending" && (
                          <div className="p-3 bg-muted/30 border-t border-border">
                            <p className="text-sm text-muted-foreground mb-3">
                              Магазин собрал ваш заказ. Посмотрите на фото и подтвердите или попросите переделать.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                onClick={() => photoApprovalMutation.mutate({ id: order.id, approval: "approved" })}
                                disabled={photoApprovalMutation.isPending}
                                data-testid={`button-approve-photo-${order.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Одобрить, отправить
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => photoApprovalMutation.mutate({ id: order.id, approval: "rejected" })}
                                disabled={photoApprovalMutation.isPending}
                                data-testid={`button-reject-photo-${order.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                                Переделать
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {order.status === "delivered" && shopReviewedShopIds.has(order.shopId) && (() => {
                      const rev = myReviews?.find((r) => r.shopId === order.shopId && !r.productId);
                      return rev ? (
                        <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md mb-2" data-testid={`review-done-${order.id}`}>
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="text-muted-foreground">Отзыв о магазине:</span>
                          <StarRating rating={rev.rating} size="sm" />
                          {rev.comment && <span className="text-xs text-muted-foreground truncate max-w-48">«{rev.comment}»</span>}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex gap-2 flex-wrap">
                      {order.status === "delivered" && !shopReviewedShopIds.has(order.shopId) && (
                        <ReviewDialog order={order} />
                      )}
                      <Link href="/chat">
                        <Button size="sm" variant="ghost" className="gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" /> Написать магазину
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <Package className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
              <p className="font-medium">Заказов пока нет</p>
              <Link href="/catalog">
                <Button data-testid="button-catalog-from-account">Перейти в каталог</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="relative">
                  {user.avatarUrl ? (
                    <div className="relative">
                      <img src={user.avatarUrl} alt="Аватар" className="w-20 h-20 rounded-full object-cover border-2 border-primary/20" />
                      <button
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        onClick={async () => {
                          await apiRequest("PATCH", "/api/auth/profile", { avatarUrl: null });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          toast({ title: "Аватар удалён" });
                        }}
                        data-testid="button-remove-avatar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      data-testid="input-upload-avatar-profile"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append("images", file);
                        const resp = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
                        const data = await resp.json();
                        if (data.urls?.[0]) {
                          await apiRequest("PATCH", "/api/auth/profile", { avatarUrl: data.urls[0] });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          toast({ title: "Аватар обновлён" });
                        }
                      }}
                    />
                    <span className="text-sm text-primary hover:underline cursor-pointer">Изменить аватар</span>
                  </label>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Имя", value: user.name },
                  { label: "Email", value: user.email },
                  { label: "Телефон", value: user.phone || "—" },
                  { label: "Роль", value: user.role === "buyer" ? "Покупатель" : user.role === "shop" ? "Продавец" : "Администратор" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="font-medium text-sm">{f.value}</p>
                  </div>
                ))}
              </div>
              {user.role === "buyer" && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" /> Ваш город
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">Используется для удобства при оформлении заказов</p>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={(user as any).buyerCity || ""}
                        onValueChange={async (v) => {
                          await apiRequest("PATCH", "/api/auth/profile", { buyerCity: v });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          toast({ title: "Город сохранён" });
                        }}
                      >
                        <SelectTrigger className="w-64" data-testid="select-buyer-city">
                          <SelectValue placeholder="Выберите город" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {RUSSIAN_CITIES.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(user as any).buyerCity && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={async () => {
                            await apiRequest("PATCH", "/api/auth/profile", { buyerCity: null });
                            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          }}
                          data-testid="button-clear-city"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {(user as any).buyerCity && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {(user as any).buyerCity}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Telegram notifications block — visible to all roles */}
              <Separator />
              <TelegramSection user={user} queryClient={queryClient} toast={toast} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
