import { useState, useEffect, type ComponentType } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MessageCircle, User, LogOut, Star, CheckCircle, Upload, Camera, X, MapPin, ShoppingBag, TrendingUp, Store, Flower2, Activity, Send, ExternalLink, Volume2, VolumeX, Gift, Copy, Link2, Lock, Eye, EyeOff, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractiveStarRating, StarRating } from "@/components/StarRating";
import { RUSSIAN_CITIES } from "@/lib/russianCities";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { Switch } from "@/components/ui/switch";
import type { Order, OrderItem, Review, OrderSupplement } from "@shared/schema";
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

function SupplementsBuyerSection({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const { data } = useQuery<{ supplements: OrderSupplement[] }>({
    queryKey: ["/api/orders", orderId, "supplements"],
    queryFn: () => fetch(`/api/orders/${orderId}/supplements`, { credentials: "include" }).then(r => r.json()),
  });
  const supplements = data?.supplements ?? [];
  const pending = supplements.filter(s => s.status === "pending");
  if (supplements.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <FileText className="w-3.5 h-3.5" />
        Доплаты от магазина
        {pending.length > 0 && (
          <span className="ml-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full px-1.5 py-0.5 text-xs">{pending.length}</span>
        )}
      </p>
      <div className="space-y-2">
        {supplements.map(s => (
          <SupplementPayRow key={s.id} supplement={s} orderId={orderId} onToast={toast} />
        ))}
      </div>
    </div>
  );
}

function SupplementPayRow({ supplement: s, orderId, onToast }: { supplement: OrderSupplement; orderId: string; onToast: ReturnType<typeof useToast>["toast"] }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("POST", `/api/supplements/${s.id}/pay`, {});
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        onToast({ title: "Ошибка", description: "Не удалось создать платёж", variant: "destructive" });
      }
    } catch (e: any) {
      onToast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      qc.invalidateQueries({ queryKey: ["/api/orders", orderId, "supplements"] });
    }
  };

  return (
    <div className="flex items-start justify-between gap-2 p-2.5 rounded-md border border-border bg-muted/30" data-testid={`supplement-buyer-row-${s.id}`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{s.reason}</p>
        {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
        <p className="text-sm font-bold mt-0.5">{Number(s.amount).toLocaleString("ru-RU")} ₽</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Badge variant={s.status === "paid" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"} className="text-xs">
          {s.status === "paid" ? "Оплачено" : s.status === "cancelled" ? "Отменено" : "Ожидает оплаты"}
        </Badge>
        {s.status === "pending" && (
          <Button size="sm" className="gap-1.5 h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={handlePay} disabled={loading} data-testid={`button-pay-supplement-${s.id}`}>
            <CreditCard className="w-3 h-3" />
            {loading ? "…" : "Оплатить"}
          </Button>
        )}
      </div>
    </div>
  );
}

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
    { label: "Любимый товар", value: favoriteProduct, icon: Flower2, color: "text-primary", truncate: true },
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

const RATING_LABELS: Record<number, string> = { 1: "Очень плохо", 2: "Плохо", 3: "Нормально", 4: "Хорошо", 5: "Отлично" };

function SubRatingRow({ label, value, onChange, testId }: { label: string; value: number; onChange: (v: number) => void; testId: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} data-testid={`${testId}-${s}`}
            className={`w-7 h-7 flex items-center justify-center transition-colors ${s <= value ? "text-amber-400" : "text-muted-foreground/30"} hover:text-amber-400`}>
            <Star className={`w-5 h-5 ${s <= value ? "fill-amber-400" : "fill-transparent"}`} strokeWidth={1.5} />
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-1 w-16 shrink-0">{RATING_LABELS[value]}</span>
      </div>
    </div>
  );
}

function ReviewDialog({ order }: { order: OrderWithItems }) {
  const [ratingPrice, setRatingPrice] = useState(5);
  const [ratingDelivery, setRatingDelivery] = useState(5);
  const [ratingService, setRatingService] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const overallRating = Math.round((ratingPrice + ratingDelivery + ratingService) / 3 * 10) / 10;

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reviews", {
      orderId: order.id,
      shopId: order.shopId,
      rating: Math.round(overallRating),
      ratingPrice,
      ratingDelivery,
      ratingService,
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
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <SubRatingRow label="Цена / качество" value={ratingPrice} onChange={setRatingPrice} testId="star-price" />
            <SubRatingRow label="Доставка" value={ratingDelivery} onChange={setRatingDelivery} testId="star-delivery" />
            <SubRatingRow label="Сервис" value={ratingService} onChange={setRatingService} testId="star-service" />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Общая оценка: <span className="font-semibold text-foreground">{overallRating} из 5</span>
          </p>
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

function SoundSection() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const toggle = (val: boolean) => {
    setSoundEnabled(val);
    setEnabled(val);
  };

  return (
    <div>
      <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
        {enabled
          ? <Volume2 className="w-4 h-4 text-primary" />
          : <VolumeX className="w-4 h-4 text-muted-foreground" />}
        Звуковые уведомления
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Звук при новом сообщении и при новом заказе (для продавцов)
      </p>
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          data-testid="switch-sound-notifications"
        />
        <span className="text-sm text-muted-foreground">{enabled ? "Включены" : "Выключены"}</span>
      </div>
    </div>
  );
}

const REASON_LABELS: Record<string, string> = {
  first_order: "Первый заказ",
  purchase_milestone: "Бонус за покупку",
  first_review: "Первый отзыв",
  referral: "Реферальный бонус",
  admin_grant: "Начисление",
  order_spend: "Списание",
};

function BonusesTab() {
  const { toast } = useToast();
  const { data: bonusData, isLoading } = useQuery<{ balance: number; transactions: any[] }>({
    queryKey: ["/api/bonuses"],
  });

  const { data: referralData } = useQuery<{ code: string; referralLink: string }>({
    queryKey: ["/api/bonuses/referral-code"],
  });

  const copyLink = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink);
      toast({ title: "Ссылка скопирована" });
    }
  };

  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Gift className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ваш баланс</div>
              <div className="text-3xl font-bold" data-testid="text-bonus-balance">{bonusData?.balance || 0} бонусов</div>
              <div className="text-xs text-muted-foreground">1 бонус = 1 ₽ · срок действия 30 дней</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" /> Реферальная программа</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Пригласите друга и получите 500 бонусов, когда он сделает первый заказ от 3000 ₽</p>
          {referralData && (
            <div className="flex items-center gap-2">
              <Input value={referralData.referralLink} readOnly className="text-xs" data-testid="input-referral-link" />
              <Button variant="outline" size="icon" onClick={copyLink} data-testid="button-copy-referral">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Как получить бонусы</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>🎁 +250 за первый заказ</li>
            <li>💰 +100 за каждые 3000 ₽ в заказе</li>
            <li>⭐ +250 за первый отзыв</li>
            <li>👥 +500 за приглашённого друга</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">История бонусов</CardTitle></CardHeader>
        <CardContent>
          {!bonusData?.transactions?.length ? (
            <p className="text-sm text-muted-foreground">Пока нет операций</p>
          ) : (
            <div className="space-y-3">
              {bonusData.transactions.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0" data-testid={`bonus-txn-${t.id}`}>
                  <div>
                    <div className="font-medium">{t.description || REASON_LABELS[t.reason] || t.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.createdAt ? format(new Date(t.createdAt), "d MMM yyyy, HH:mm", { locale: ru }) : ""}
                      {t.amount > 0 && t.expiresAt && (
                        <span className="ml-2 text-amber-600">сгорает {format(new Date(t.expiresAt), "d MMM yyyy", { locale: ru })}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={t.amount > 0 ? "default" : "destructive"}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/change-password", { currentPassword: pwCurrent, newPassword: pwNew }),
    onSuccess: () => {
      toast({ title: "Пароль успешно изменён" });
      setShowPasswordForm(false);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    },
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast({ title: "Оплата прошла успешно", description: "Магазин получил ваш заказ и приступит к сборке." });
      window.history.replaceState({}, "", "/account");
    } else if (payment === "failed") {
      toast({ title: "Оплата не завершена", description: "Попробуйте оплатить заказ позже через службу поддержки.", variant: "destructive" });
      window.history.replaceState({}, "", "/account");
    }
  }, []);

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
          <TabsTrigger value="bonuses" className="gap-1.5" data-testid="tab-bonuses">
            <Gift className="w-4 h-4" /> Бонусы
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
                          <p className="font-semibold text-sm">Заказ #{(order as any).orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
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
                    <SupplementsBuyerSection orderId={order.id} />
                    <div className="flex gap-2 flex-wrap mt-3">
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

        <TabsContent value="bonuses">
          <BonusesTab />
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

              {/* Change password */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-primary" /> Пароль
                  </p>
                  {!showPasswordForm && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setShowPasswordForm(true)}
                      data-testid="button-change-password-open"
                    >
                      Изменить пароль
                    </Button>
                  )}
                </div>
                {showPasswordForm && (
                  <div className="space-y-3 mt-3">
                    <div className="relative">
                      <Input
                        type={showPwCurrent ? "text" : "password"}
                        placeholder="Текущий пароль"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        data-testid="input-current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPwCurrent((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPwCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPwNew ? "text" : "password"}
                        placeholder="Новый пароль (не менее 6 символов)"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        data-testid="input-new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPwNew((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPwNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPwConfirm ? "text" : "password"}
                        placeholder="Подтвердите новый пароль"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        data-testid="input-confirm-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPwConfirm((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPwConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwNew && pwConfirm && pwNew !== pwConfirm && (
                      <p className="text-xs text-destructive">Пароли не совпадают</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (pwNew !== pwConfirm) {
                            toast({ title: "Пароли не совпадают", variant: "destructive" });
                            return;
                          }
                          changePasswordMutation.mutate();
                        }}
                        disabled={changePasswordMutation.isPending || !pwCurrent || !pwNew || !pwConfirm}
                        data-testid="button-change-password-submit"
                      >
                        {changePasswordMutation.isPending ? "Сохранение..." : "Сохранить пароль"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPwCurrent(""); setPwNew(""); setPwConfirm("");
                        }}
                        data-testid="button-change-password-cancel"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Telegram notifications block — visible to all roles */}
              <Separator />
              <TelegramSection user={user} queryClient={queryClient} toast={toast} />

              {/* Sound notifications */}
              <Separator />
              <SoundSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
