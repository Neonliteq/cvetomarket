import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Package, ShoppingBag, BarChart2, MessageCircle, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Product, Order, Shop, Category, Review } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый", confirmed: "Подтверждён", in_delivery: "В доставке",
  delivered: "Доставлен", completed: "Завершён", cancelled: "Отменён",
};

type OrderWithItems = Order & { buyerName?: string; items?: { productName: string; quantity: number; price: string }[] };

const productSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  description: z.string().optional(),
  price: z.string().min(1, "Введите цену"),
  categoryId: z.string().optional(),
  assemblyTime: z.coerce.number().min(0).default(60),
  inStock: z.boolean().default(true),
  isActive: z.boolean().default(true),
  images: z.string().optional(),
});

function ProductForm({
  shopId,
  categories,
  product,
  onSuccess,
}: {
  shopId: string;
  categories: Category[];
  product?: Product;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price?.toString() || "",
      categoryId: product?.categoryId || "",
      assemblyTime: product?.assemblyTime || 60,
      inStock: product?.inStock ?? true,
      isActive: product?.isActive ?? true,
      images: product?.images?.join(",") || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof productSchema>) => {
      const payload = {
        ...data,
        shopId,
        price: data.price,
        images: data.images ? data.images.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      return product
        ? apiRequest("PATCH", `/api/products/${product.id}`, payload)
        : apiRequest("POST", "/api/products", payload);
    },
    onSuccess: () => {
      toast({ title: product ? "Товар обновлён" : "Товар добавлен" });
      onSuccess();
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} placeholder="Букет роз" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Описание</FormLabel><FormControl><Textarea {...field} placeholder="Описание букета..." /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem><FormLabel>Цена (₽)</FormLabel><FormControl><Input {...field} type="number" placeholder="2500" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="assemblyTime" render={({ field }) => (
            <FormItem><FormLabel>Время сборки (мин)</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="categoryId" render={({ field }) => (
          <FormItem><FormLabel>Категория</FormLabel>
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger></FormControl>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          <FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="images" render={({ field }) => (
          <FormItem><FormLabel>Ссылки на фото (через запятую)</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex gap-6">
          <FormField control={form.control} name="inStock" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">В наличии</FormLabel>
            </FormItem>
          )} />
          <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">Активен</FormLabel>
            </FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Сохраняем..." : product ? "Сохранить изменения" : "Добавить товар"}
        </Button>
      </form>
    </Form>
  );
}

export default function ShopDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const { data: myShop, isLoading: loadingShop } = useQuery<Shop & { cityName?: string }>({
    queryKey: ["/api/shops/my"],
    enabled: !!user && user.role === "shop",
  });

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: [`/api/shops/${myShop?.id}/products`],
    enabled: !!myShop?.id,
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/shop"],
    enabled: !!user && user.role === "shop",
  });

  const { data: reviews } = useQuery<(Review & { buyerName?: string })[]>({
    queryKey: [`/api/shops/${myShop?.id}/reviews`],
    enabled: !!myShop?.id,
  });

  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Товар удалён" });
      qc.invalidateQueries({ queryKey: [`/api/shops/${myShop?.id}/products`] });
      qc.invalidateQueries({ queryKey: ["/api/products/featured"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/orders/shop"] }),
  });

  const toggleProductMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/products/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/shops/${myShop?.id}/products`] });
      qc.invalidateQueries({ queryKey: ["/api/products/featured"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  if (!user || user.role !== "shop") {
    navigate("/auth");
    return null;
  }

  if (loadingShop) return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    </div>
  );

  if (!myShop) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
      <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
      <h2 className="text-xl font-bold">Магазин ещё не создан</h2>
      <p className="text-muted-foreground text-sm">
        Обратитесь к администратору платформы или создайте магазин через регистрацию
      </p>
    </div>
  );

  const totalRevenue = (orders || [])
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const pendingOrders = (orders || []).filter((o) => o.status === "new" || o.status === "confirmed").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{myShop.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={myShop.status === "approved" ? "default" : myShop.status === "pending" ? "secondary" : "destructive"}>
              {myShop.status === "approved" ? "Активен" : myShop.status === "pending" ? "На модерации" : "Отклонён"}
            </Badge>
            {myShop.cityName && <span className="text-sm text-muted-foreground">{myShop.cityName}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { title: "Всего заказов", value: orders?.length || 0, icon: Package },
          { title: "Ожидают обработки", value: pendingOrders, icon: ShoppingBag },
          { title: "Общий доход", value: `${totalRevenue.toLocaleString("ru-RU")} ₽`, icon: BarChart2 },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="products">
        <TabsList className="mb-6">
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="orders">
            Заказы {pendingOrders > 0 && <Badge className="ml-1.5">{pendingOrders}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reviews">Отзывы</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Товары ({products?.length || 0})</h3>
            <Dialog open={productDialogOpen} onOpenChange={(o) => { setProductDialogOpen(o); if (!o) setEditProduct(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5" data-testid="button-add-product">
                  <Plus className="w-4 h-4" /> Добавить товар
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editProduct ? "Редактировать товар" : "Новый товар"}</DialogTitle>
                </DialogHeader>
                <ProductForm
                  shopId={myShop.id}
                  categories={categories || []}
                  product={editProduct || undefined}
                  onSuccess={() => {
                    setProductDialogOpen(false);
                    setEditProduct(null);
                    qc.invalidateQueries({ queryKey: [`/api/shops/${myShop.id}/products`] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {loadingProducts ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : products?.length ? (
            <div className="space-y-3">
              {products.map((p) => (
                <Card key={p.id} className={!p.isActive ? "opacity-60" : ""} data-testid={`card-product-${p.id}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                      <img
                        src={p.images?.[0] || "/images/placeholder-bouquet.png"}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-bold text-sm">{Number(p.price).toLocaleString("ru-RU")} ₽</span>
                        <Badge variant={p.inStock ? "default" : "secondary"} className="text-xs">
                          {p.inStock ? "В наличии" : "Нет в наличии"}
                        </Badge>
                        <Badge variant={p.isActive ? "outline" : "secondary"} className="text-xs">
                          {p.isActive ? "Активен" : "Скрыт"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleProductMutation.mutate({ id: p.id, isActive: !p.isActive })}
                        data-testid={`button-toggle-${p.id}`}
                      >
                        {p.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditProduct(p); setProductDialogOpen(true); }}
                        data-testid={`button-edit-${p.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteProductMutation.mutate(p.id)}
                        data-testid={`button-delete-${p.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p>Нет товаров. Добавьте первый!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {loadingOrders ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
          ) : orders?.length ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-sm">Заказ #{order.id.slice(0, 8).toUpperCase()}</p>
                        {order.buyerName && <p className="text-xs text-muted-foreground">Покупатель: {order.buyerName}</p>}
                        {order.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</p>
                        <p className="text-xs text-muted-foreground">{order.deliveryDate} {order.deliveryTime}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{order.deliveryAddress}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Статус:</span>
                      <Select value={order.status} onValueChange={(s) => updateOrderMutation.mutate({ id: order.id, status: s })}>
                        <SelectTrigger className="w-40 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p>Заказов пока нет</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews">
          {reviews?.length ? (
            <div className="space-y-4">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="font-medium text-sm">{r.buyerName || "Аноним"}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                        ))}
                      </div>
                      {r.createdAt && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(r.createdAt), "d MMM yyyy", { locale: ru })}
                        </span>
                      )}
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p>Отзывов пока нет</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
