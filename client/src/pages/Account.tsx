import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MessageCircle, User, LogOut, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InteractiveStarRating } from "@/components/StarRating";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order, OrderItem } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type OrderWithItems = Order & {
  items?: (OrderItem & { productName?: string; productImage?: string })[];
  shopName?: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  in_delivery: "В доставке",
  delivered: "Доставлен",
  completed: "Завершён",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  new: "secondary",
  confirmed: "default",
  in_delivery: "default",
  delivered: "default",
  completed: "outline",
  cancelled: "destructive",
};

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
      toast({ title: "Отзыв отправлен", description: "Спасибо за вашу оценку!" });
      qc.invalidateQueries({ queryKey: ["/api/orders/my"] });
      setOpen(false);
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid={`button-review-${order.id}`}>
          <Star className="w-3.5 h-3.5" /> Оставить отзыв
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оценить заказ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Ваша оценка</p>
            <InteractiveStarRating value={rating} onChange={setRating} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Комментарий (необязательно)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите о заказе..."
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

  if (authLoading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

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
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="shrink-0 flex items-center gap-2">
                            <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                              <img
                                src={item.productImage || "/images/placeholder-bouquet.png"}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-medium max-w-24 truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {order.status === "completed" && <ReviewDialog order={order} />}
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
