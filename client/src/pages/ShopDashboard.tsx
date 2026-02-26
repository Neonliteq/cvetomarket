import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit, Trash2, Package, ShoppingBag, BarChart2, MessageCircle,
  Eye, EyeOff, Star, MapPin, Phone, Calendar, Clock, User, FileText, Send, Settings, Truck,
  Upload, Image, X
} from "lucide-react";
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
import { useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Product, Order, Shop, Category, Review } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { DeliveryZonesMap, type DeliveryZone } from "@/components/DeliveryZonesMap";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый", confirmed: "Подтверждён", assembling: "Сборка",
  delivering: "Доставка", delivered: "Доставлен", cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  assembling: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  delivering: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type OrderItem = { productName: string; productImage?: string | null; quantity: number; price: string };
type OrderWithItems = Order & { buyerName?: string; items?: OrderItem[] };

const PRODUCT_TYPES = { bouquet: "Букет", gift: "Подарок", tasty_gift: "Вкусный подарок" } as const;

const productSchema = z.object({
  type: z.string().default("bouquet"),
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
  const [uploadedImages, setUploadedImages] = useState<string[]>(product?.images || []);
  const [uploading, setUploading] = useState(false);
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: (product as any)?.type || "bouquet",
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price?.toString() || "",
      categoryId: product?.categoryId || "",
      assemblyTime: product?.assemblyTime || 60,
      inStock: product?.inStock ?? true,
      isActive: product?.isActive ?? true,
      images: "",
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("images", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (data.urls) {
        setUploadedImages((prev) => [...prev, ...data.urls]);
        toast({ title: `Загружено ${data.urls.length} фото` });
      }
    } catch {
      toast({ title: "Ошибка загрузки", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof productSchema>) => {
      const urlImages = data.images ? data.images.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const allImages = [...uploadedImages, ...urlImages];
      const payload = { ...data, shopId, price: data.price, images: allImages };
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
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Тип товара</FormLabel>
            <Select value={field.value || "bouquet"} onValueChange={field.onChange}>
              <FormControl><SelectTrigger data-testid="select-product-type"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="bouquet">Букет</SelectItem>
                <SelectItem value="gift">Подарок</SelectItem>
                <SelectItem value="tasty_gift">Вкусный подарок</SelectItem>
              </SelectContent>
            </Select>
          <FormMessage /></FormItem>
        )} />
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

        <div className="space-y-2">
          <FormLabel>Фото товара</FormLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadedImages.map((img, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer" data-testid="input-file-upload">
              <div className="border-2 border-dashed rounded-md p-3 text-center text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                {uploading ? "Загружаем..." : "Нажмите для загрузки фото"}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <FormField control={form.control} name="images" render={({ field }) => (
          <FormItem>
            <FormLabel>Или ссылки на фото (через запятую)</FormLabel>
            <FormControl><Input {...field} placeholder="https://..." /></FormControl>
            <FormMessage />
          </FormItem>
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
        <Button type="submit" className="w-full" disabled={mutation.isPending || uploading}>
          {mutation.isPending ? "Сохраняем..." : product ? "Сохранить изменения" : "Добавить товар"}
        </Button>
      </form>
    </Form>
  );
}

export default function ShopDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const qc = useQueryClient();
  const tabParam = new URLSearchParams(searchStr).get("tab");
  const validTabs = ["products", "orders", "reviews", "settings"];
  const [activeTab, setActiveTab] = useState(validTabs.includes(tabParam || "") ? tabParam! : "products");
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSort, setOrderSort] = useState<"date-desc" | "date-asc" | "time-asc" | "time-desc">("date-desc");

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

  const updateShopMutation = useMutation({
    mutationFn: (data: Record<string, any>) => apiRequest("PATCH", `/api/shops/${myShop?.id}`, data),
    onSuccess: () => {
      toast({ title: "Настройки сохранены" });
      qc.invalidateQueries({ queryKey: ["/api/shops/my"] });
    },
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "shop")) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return null;
  if (!user || user.role !== "shop") return null;

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

      <Tabs value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        if (tab === "reviews") {
          fetch("/api/reviews/seen", { method: "POST", credentials: "include" }).then(() => {
            qc.invalidateQueries({ queryKey: ["/api/notifications"] });
          });
        }
      }}>
        <TabsList className="mb-6">
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="orders">
            Заказы {pendingOrders > 0 && <Badge className="ml-1.5">{pendingOrders}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reviews">Отзывы</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
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
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
            </div>
          ) : orders?.length ? (
            <div className="space-y-4">
              <div className="space-y-3" data-testid="orders-sort-controls">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Все" },
                    { value: "new", label: "Новый" },
                    { value: "confirmed", label: "Подтверждён" },
                    { value: "assembling", label: "Собран" },
                    { value: "delivering", label: "На доставке" },
                    { value: "delivered", label: "Доставлен" },
                    { value: "cancelled", label: "Отменён" },
                  ].map((f) => (
                    <Button
                      key={f.value}
                      size="sm"
                      variant={orderStatusFilter === f.value ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => setOrderStatusFilter(f.value)}
                      data-testid={`button-filter-${f.value}`}
                    >
                      {f.label}
                      {f.value !== "all" && (() => {
                        const count = (orders || []).filter((o) => o.status === f.value).length;
                        return count > 0 ? <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] leading-4">{count}</Badge> : null;
                      })()}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Сортировка:</span>
                  <Select value={orderSort} onValueChange={(v: any) => setOrderSort(v)}>
                    <SelectTrigger className="w-48 h-8 text-xs" data-testid="select-order-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Дата (новые сверху)</SelectItem>
                      <SelectItem value="date-asc">Дата (старые сверху)</SelectItem>
                      <SelectItem value="time-asc">Время доставки (ранние)</SelectItem>
                      <SelectItem value="time-desc">Время доставки (поздние)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(() => {
                const filtered = (orders || []).filter((o) => orderStatusFilter === "all" || o.status === orderStatusFilter);
                const sorted = [...filtered].sort((a, b) => {
                  if (orderSort === "date-desc") return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
                  if (orderSort === "date-asc") return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
                  if (orderSort === "time-asc") return (a.deliveryTime || "").localeCompare(b.deliveryTime || "");
                  return (b.deliveryTime || "").localeCompare(a.deliveryTime || "");
                });
                if (sorted.length === 0) return (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto opacity-20 mb-3" />
                    <p>Нет заказов с таким статусом</p>
                  </div>
                );
                return sorted.map((order) => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-base">Заказ #{order.id.slice(0, 8).toUpperCase()}</p>
                          <Badge className={`text-xs ${STATUS_COLORS[order.status] || ""}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </div>
                        {order.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</p>
                        {Number(order.deliveryCost) > 0 && (
                          <p className="text-xs text-muted-foreground">вкл. доставка {Number(order.deliveryCost).toLocaleString("ru-RU")} ₽</p>
                        )}
                      </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Товары</p>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-muted/50" data-testid={`order-item-${order.id}-${idx}`}>
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                                <img
                                  src={item.productImage || "/images/placeholder-bouquet.png"}
                                  alt={item.productName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">{item.quantity} шт. x {Number(item.price).toLocaleString("ru-RU")} ₽</p>
                              </div>
                              <p className="text-sm font-semibold shrink-0">
                                {(item.quantity * Number(item.price)).toLocaleString("ru-RU")} ₽
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Получатель</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{order.recipientName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <a href={`tel:${order.recipientPhone}`} className="text-primary hover:underline">{order.recipientPhone}</a>
                          </div>
                        </div>
                        {order.buyerName && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                            <span>Заказчик: {order.buyerName}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Доставка</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{order.deliveryAddress}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{order.deliveryDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{order.deliveryTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {order.comment && (
                      <div className="mb-4 p-3 rounded-md bg-muted/50 border border-border">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Комментарий к заказу</p>
                        </div>
                        <p className="text-sm">{order.comment}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Статус:</span>
                        <Select value={order.status} onValueChange={(s) => updateOrderMutation.mutate({ id: order.id, status: s })} disabled={order.status === "delivered"}>
                          <SelectTrigger className="w-40 h-8 text-xs" data-testid={`select-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 ml-auto"
                        onClick={async () => {
                          try {
                            await apiRequest("POST", "/api/messages", {
                              receiverId: order.buyerId,
                              content: `Здравствуйте! По вашему заказу #${order.id.slice(0, 8).toUpperCase()}`,
                            });
                            navigate(`/chat?userId=${order.buyerId}`);
                          } catch {
                            navigate("/chat");
                          }
                        }}
                        data-testid={`button-message-buyer-${order.id}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Написать заказчику
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ));
              })()}
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

        <TabsContent value="settings">
          <div className="max-w-lg space-y-6">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Фото магазина</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Логотип</label>
                    <div className="flex items-center gap-4">
                      {myShop?.logoUrl ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                          <img src={myShop.logoUrl} alt="Логотип" className="w-full h-full object-cover" />
                          <button
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                            onClick={() => updateShopMutation.mutate({ logoUrl: null })}
                            data-testid="button-remove-logo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            data-testid="input-upload-logo"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append("images", file);
                              const resp = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
                              const data = await resp.json();
                              if (data.urls?.[0]) updateShopMutation.mutate({ logoUrl: data.urls[0] });
                            }}
                          />
                          <span className="text-sm text-primary hover:underline cursor-pointer">Загрузить логотип</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">Рекомендуется 200×200px</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm font-medium mb-2 block">Обложка магазина</span>
                    {myShop?.coverUrl ? (
                      <div className="relative w-full h-36 rounded-lg overflow-hidden border">
                        <img src={myShop.coverUrl} alt="Обложка" className="w-full h-full object-cover" />
                        <button
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                          onClick={() => updateShopMutation.mutate({ coverUrl: null })}
                          data-testid="button-remove-cover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}
                    <label className="cursor-pointer block mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        data-testid="input-upload-cover"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast({ title: "Файл слишком большой", description: "Максимум 5 МБ", variant: "destructive" });
                            return;
                          }
                          const fd = new FormData();
                          fd.append("images", file);
                          try {
                            const resp = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
                            if (!resp.ok) {
                              toast({ title: "Ошибка загрузки", description: "Не удалось загрузить файл", variant: "destructive" });
                              return;
                            }
                            const data = await resp.json();
                            if (data.urls?.[0]) {
                              updateShopMutation.mutate({ coverUrl: data.urls[0] });
                            }
                          } catch {
                            toast({ title: "Ошибка загрузки", variant: "destructive" });
                          }
                        }}
                      />
                      {!myShop?.coverUrl && (
                        <div className="w-full h-36 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
                          <Upload className="w-8 h-8 text-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground">Нажмите, чтобы загрузить обложку</span>
                        </div>
                      )}
                      {myShop?.coverUrl && (
                        <span className="text-sm text-primary hover:underline cursor-pointer inline-block mt-1">Заменить обложку</span>
                      )}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Рекомендуется 1200×400px</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Доставка по умолчанию</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Стоимость доставки (₽)</label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      defaultValue={myShop?.deliveryPrice?.toString() || "300"}
                      key={myShop?.deliveryPrice?.toString()}
                      id="delivery-price-input"
                      placeholder="300"
                      data-testid="input-delivery-price"
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById("delivery-price-input") as HTMLInputElement;
                        const val = input?.value;
                        if (val !== undefined && val !== "") {
                          updateShopMutation.mutate({ deliveryPrice: val });
                        }
                      }}
                      disabled={updateShopMutation.isPending}
                      data-testid="button-save-delivery-price"
                    >
                      Сохранить
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Используется, если адрес не попадает ни в одну зону. Текущая: {Number(myShop?.deliveryPrice || 300).toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Зоны доставки на карте</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Нарисуйте зоны доставки на карте и укажите стоимость для каждой зоны.
                </p>
                <DeliveryZonesMap
                  zones={((myShop as any)?.deliveryZones || []) as DeliveryZone[]}
                  onSave={(zones) => {
                    updateShopMutation.mutate({ deliveryZones: zones });
                  }}
                  saving={updateShopMutation.isPending}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Информация о магазине</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Описание</label>
                    <Textarea
                      defaultValue={myShop?.description || ""}
                      key={`desc-${myShop?.description}`}
                      id="shop-description-input"
                      placeholder="Расскажите о вашем магазине..."
                      data-testid="input-shop-description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Телефон</label>
                    <Input
                      defaultValue={myShop?.phone || ""}
                      key={`phone-${myShop?.phone}`}
                      id="shop-phone-input"
                      placeholder="+7 (999) 000-00-00"
                      data-testid="input-shop-phone"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Адрес</label>
                    <Input
                      defaultValue={myShop?.address || ""}
                      key={`addr-${myShop?.address}`}
                      id="shop-address-input"
                      placeholder="Город, улица, дом"
                      data-testid="input-shop-address"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Часы работы</label>
                    <Input
                      defaultValue={myShop?.workingHours || ""}
                      key={`wh-${myShop?.workingHours}`}
                      id="shop-hours-input"
                      placeholder="Пн-Пт 9:00-18:00, Сб 10:00-16:00"
                      data-testid="input-shop-hours"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Зона доставки</label>
                    <Input
                      defaultValue={myShop?.deliveryZone || ""}
                      key={`dz-${myShop?.deliveryZone}`}
                      id="shop-zone-input"
                      placeholder="В пределах МКАД"
                      data-testid="input-shop-zone"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      const desc = (document.getElementById("shop-description-input") as HTMLTextAreaElement)?.value;
                      const phone = (document.getElementById("shop-phone-input") as HTMLInputElement)?.value;
                      const address = (document.getElementById("shop-address-input") as HTMLInputElement)?.value;
                      const workingHours = (document.getElementById("shop-hours-input") as HTMLInputElement)?.value;
                      const deliveryZone = (document.getElementById("shop-zone-input") as HTMLInputElement)?.value;
                      updateShopMutation.mutate({ description: desc, phone, address, workingHours, deliveryZone });
                    }}
                    disabled={updateShopMutation.isPending}
                    data-testid="button-save-shop-info"
                  >
                    Сохранить информацию
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
