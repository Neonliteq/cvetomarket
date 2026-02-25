import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MessageCircle, User, LogOut, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InteractiveStarRating, StarRating } from "@/components/StarRating";
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

function ProductReviewDialog({ order, item, alreadyReviewed }: { 
  order: OrderWithItems; 
  item: OrderItem & { productName?: string; productImage?: string };
  alreadyReviewed?: Review;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ["/api/reviews/my"] });
      qc.invalidateQueries({ queryKey: ["/api/products", item.productId, "reviews"] });
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
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ["/api/orders/my"] });
      qc.invalidateQueries({ queryKey: ["/api/reviews/my"] });
      qc.invalidateQueries({ queryKey: ["/api/shops", order.shopId, "reviews"] });
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

export default function Account() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/my"],
    enabled: !!user,
  });

  const { data: myReviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews/my"],
    enabled: !!user,
  });

  const shopReviewedOrderIds = new Set((myReviews || []).filter((r) => !r.productId).map((r) => r.orderId));
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
        <div>
          <h1 className="text-2xl font-bold">Личный кабинет</h1>
          <p className="text-muted-foreground">{user.name} · {user.email}</p>
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
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
            </div>
          ) : orders?.length ? (
            <div className="space-y-4">
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
                    {order.status === "delivered" && shopReviewedOrderIds.has(order.id) && (() => {
                      const rev = myReviews?.find((r) => r.orderId === order.id && !r.productId);
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
                      {order.status === "delivered" && !shopReviewedOrderIds.has(order.id) && (
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
