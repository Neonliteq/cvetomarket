import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit, Trash2, Package, ShoppingBag, BarChart2, MessageCircle,
  Eye, EyeOff, Star, MapPin, Phone, Calendar, Clock, User, FileText, Send, Settings, Truck,
  Upload, Image, X, Users, UserPlus, UserMinus, Crown, Tag, CheckCircle, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
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
import type { Product, Order, Shop, Category, Review, OrderSupplement } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { DeliveryZonesMap, type DeliveryZone } from "@/components/DeliveryZonesMap";
import { ShopLocationMap } from "@/components/ShopLocationMap";

const STATUS_LABELS: Record<string, string> = {
  new: "Новый", confirmed: "Подтверждён", assembling: "Сборка",
  delivering: "Доставка", delivered: "Доставлен", cancelled: "Отменён",
};

function SupplementsSection({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useQuery<{ supplements: OrderSupplement[] }>({
    queryKey: ["/api/orders", orderId, "supplements"],
    queryFn: () => fetch(`/api/orders/${orderId}/supplements`, { credentials: "include" }).then(r => r.json()),
  });
  const supplements = data?.supplements ?? [];

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/orders/${orderId}/supplements`, { amount: Number(amount), reason, description }),
    onSuccess: () => {
      toast({ title: "Счёт на доплату выставлен" });
      qc.invalidateQueries({ queryKey: ["/api/orders", orderId, "supplements"] });
      setFormOpen(false); setAmount(""); setReason(""); setDescription("");
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/supplements/${id}/cancel`, {}),
    onSuccess: () => {
      toast({ title: "Доплата отменена" });
      qc.invalidateQueries({ queryKey: ["/api/orders", orderId, "supplements"] });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const pendingCount = supplements.filter(s => s.status === "pending").length;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Доплаты
          {pendingCount > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full px-1.5 py-0.5 text-xs">{pendingCount}</span>
          )}
        </span>
        {!formOpen && (
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setFormOpen(true)} data-testid={`button-add-supplement-${orderId}`}>
            <Plus className="w-3 h-3" /> Выставить счёт
          </Button>
        )}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Загрузка…</p>}

      {supplements.length > 0 && (
        <div className="space-y-2 mb-2">
          {supplements.map(s => (
            <div key={s.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/50 text-sm" data-testid={`supplement-row-${s.id}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{s.reason}</p>
                {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                <p className="font-bold text-xs mt-0.5">{Number(s.amount).toLocaleString("ru-RU")} ₽</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={s.status === "paid" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"} className="text-xs">
                  {s.status === "paid" ? "Оплачено" : s.status === "cancelled" ? "Отменено" : "Ожидает"}
                </Badge>
                {s.status === "pending" && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive hover:text-destructive px-2" onClick={() => cancelMutation.mutate(s.id)} disabled={cancelMutation.isPending} data-testid={`button-cancel-supplement-${s.id}`}>
                    <X className="w-3 h-3 mr-0.5" /> Отменить
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="space-y-2 p-3 bg-muted/40 rounded-md border border-border">
          <Input
            placeholder="Причина доплаты (обязательно)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="h-8 text-sm"
            data-testid={`input-supplement-reason-${orderId}`}
          />
          <Input
            type="number"
            placeholder="Сумма, ₽"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="h-8 text-sm"
            data-testid={`input-supplement-amount-${orderId}`}
          />
          <Textarea
            placeholder="Комментарий (необязательно)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="text-sm min-h-[56px]"
            data-testid={`input-supplement-description-${orderId}`}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !reason.trim() || !amount} data-testid={`button-submit-supplement-${orderId}`}>
              Выставить счёт
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setFormOpen(false); setAmount(""); setReason(""); setDescription(""); }}>
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  composition: z.string().optional(),
  price: z.string().min(1, "Введите цену"),
  categoryId: z.string().optional(),
  assemblyTime: z.coerce.number().min(0).default(60),
  inStock: z.boolean().default(true),
  isActive: z.boolean().default(true),
  discountPercent: z.coerce.number().min(0).max(99).default(0),
  isRecommended: z.boolean().default(false),
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
  const [tags, setTags] = useState<string[]>((product as any)?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: (product as any)?.type || "bouquet",
      name: product?.name || "",
      description: product?.description || "",
      composition: (product as any)?.composition || "",
      price: product?.price?.toString() || "",
      categoryId: product?.categoryId || "",
      assemblyTime: product?.assemblyTime || 60,
      inStock: product?.inStock ?? true,
      isActive: product?.isActive ?? true,
      discountPercent: (product as any)?.discountPercent ?? 0,
      isRecommended: (product as any)?.isRecommended ?? false,
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
      const payload = { ...data, shopId, price: data.price, images: allImages, tags };
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
                <SelectItem value="addon">Доп. товар (открытка, удобрение и т.д.)</SelectItem>
              </SelectContent>
            </Select>
          <FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} placeholder="Букет роз" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Описание</FormLabel><FormControl><Textarea {...field} placeholder="Описание букета..." rows={2} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="composition" render={({ field }) => (
          <FormItem>
            <FormLabel>Состав</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Например: 15 красных роз, зелень эвкалипта, упаковка крафт..."
                rows={3}
                data-testid="input-composition"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {/* Tags */}
        <div className="space-y-2">
          <FormLabel className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Теги для поиска</FormLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                {tag}
                <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const val = tagInput.trim().replace(/,/g, "").toLowerCase();
                  if (val && !tags.includes(val)) setTags((prev) => [...prev, val]);
                  setTagInput("");
                }
              }}
              placeholder="Введите тег и нажмите Enter (роза, тюльпан, красный...)"
              data-testid="input-tag"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const val = tagInput.trim().replace(/,/g, "").toLowerCase();
                if (val && !tags.includes(val)) setTags((prev) => [...prev, val]);
                setTagInput("");
              }}
            >
              Добавить
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Теги помогают покупателям находить товар по цветам и составу</p>
        </div>

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

        <FormField control={form.control} name="discountPercent" render={({ field }) => (
          <FormItem>
            <FormLabel>Скидка (%)</FormLabel>
            <FormControl><Input {...field} type="number" min="0" max="99" placeholder="0" data-testid="input-discount" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex flex-wrap gap-6">
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
          <FormField control={form.control} name="isRecommended" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-recommended" /></FormControl>
              <FormLabel className="!mt-0">Рекомендуем</FormLabel>
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

function ProductFormModal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="text-left shrink-0">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default function ShopDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const qc = useQueryClient();

  const telegramConnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/telegram/link");
      return res as { url: string };
    },
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: () => toast({ title: "Ошибка", description: "Не удалось получить ссылку", variant: "destructive" }),
  });

  const telegramDisconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/telegram/link"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Telegram отключён" });
    },
  });

  const tabParam = new URLSearchParams(searchStr).get("tab");
  const validTabs = ["products", "orders", "reviews", "settings", "workers"];
  const [activeTab, setActiveTab] = useState(validTabs.includes(tabParam || "") ? tabParam! : "products");
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSort, setOrderSort] = useState<"date-desc" | "date-asc" | "time-asc" | "time-desc">("date-desc");
  const [orderSearch, setOrderSearch] = useState("");

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

  type WorkerUser = { id: string; name: string; email: string; avatarUrl?: string | null };
  type ShopWorkerWithUser = { id: string; shopId: string; userId: string; createdAt?: string; user?: WorkerUser };
  const { data: workersData } = useQuery<{ workers: ShopWorkerWithUser[]; isOwner: boolean }>({
    queryKey: ["/api/shops/my/workers"],
    enabled: !!myShop?.id,
  });
  const isOwner = myShop ? (myShop.ownerId === user?.id) : (workersData?.isOwner ?? true);
  const workers = workersData?.workers ?? [];

  const inviteWorkerMutation = useMutation({
    mutationFn: ({ email, name }: { email: string; name?: string }) =>
      apiRequest("POST", "/api/shops/my/workers/invite", { email, name }),
    onSuccess: (data: any) => {
      const msg = data.isNew
        ? `Создан аккаунт для ${data.user?.email}. Сообщите сотруднику его email и попросите использовать «Забыл пароль» для входа.`
        : `${data.user?.name} добавлен в магазин`;
      toast({ title: "Сотрудник добавлен", description: msg });
      setInviteEmail("");
      setInviteName("");
      qc.invalidateQueries({ queryKey: ["/api/shops/my/workers"] });
    },
    onError: (err: any) => {
      let msg = "Ошибка";
      try { msg = JSON.parse(err.message.slice(err.message.indexOf("{"))).error; } catch {}
      toast({ title: "Ошибка", description: msg, variant: "destructive" });
    },
  });

  const removeWorkerMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/shops/my/workers/${userId}`, {}),
    onSuccess: () => {
      toast({ title: "Сотрудник удалён" });
      qc.invalidateQueries({ queryKey: ["/api/shops/my/workers"] });
    },
    onError: () => toast({ title: "Ошибка удаления", variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Товар удалён" });
      qc.invalidateQueries({ queryKey: [`/api/shops/${myShop?.id}/products`] });
      qc.invalidateQueries({ queryKey: ["/api/products/featured"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const [assemblyPhotos, setAssemblyPhotos] = useState<Record<string, { url?: string; uploading: boolean }>>({});

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status, assemblyPhotoUrl }: { id: string; status: string; assemblyPhotoUrl?: string }) =>
      apiRequest("PATCH", `/api/orders/${id}/status`, { status, assemblyPhotoUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/orders/shop"] }),
    onError: (err: any) => toast({ title: "Ошибка", description: err.message, variant: "destructive" }),
  });

  const uploadAssemblyPhoto = async (orderId: string, file: File) => {
    setAssemblyPhotos(p => ({ ...p, [orderId]: { uploading: true } }));
    try {
      const fd = new FormData();
      fd.append("images", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      const url = data.urls?.[0] || data[0];
      setAssemblyPhotos(p => ({ ...p, [orderId]: { url, uploading: false } }));
    } catch {
      setAssemblyPhotos(p => ({ ...p, [orderId]: { uploading: false } }));
      toast({ title: "Ошибка загрузки фото", variant: "destructive" });
    }
  };

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
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="orders">
            Заказы {pendingOrders > 0 && <Badge className="ml-1.5">{pendingOrders}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reviews">Отзывы</TabsTrigger>
          {isOwner && <TabsTrigger value="workers" data-testid="tab-workers">
            <Users className="w-4 h-4 mr-1.5" />
            Сотрудники {workers.length > 0 && <Badge variant="secondary" className="ml-1.5">{workers.length}</Badge>}
          </TabsTrigger>}
          {isOwner && <TabsTrigger value="settings">Настройки</TabsTrigger>}
        </TabsList>

        <TabsContent value="products">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Товары ({products?.length || 0})</h3>
            <Button size="sm" className="gap-1.5" data-testid="button-add-product" onClick={() => setProductDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Добавить товар
            </Button>
            <ProductFormModal
              open={productDialogOpen}
              onOpenChange={(o) => { setProductDialogOpen(o); if (!o) setEditProduct(null); }}
              title={editProduct ? "Редактировать товар" : "Новый товар"}
            >
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
            </ProductFormModal>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    placeholder="Поиск: #номер, получатель…"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-48 h-8 text-xs"
                    data-testid="input-order-search"
                  />
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
                const filtered = (orders || []).filter((o) => {
                  if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
                  if (!orderSearch.trim()) return true;
                  const q = orderSearch.trim().toLowerCase().replace("#", "");
                  const num = (o as any).orderNumber?.toString() || "";
                  return num === q || o.id.startsWith(q) || o.recipientName?.toLowerCase().includes(q);
                });
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
                          <p className="font-bold text-base">Заказ #{(order as any).orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
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

                    {order.status === "confirmed" && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Фото готового букета
                        </p>
                        {(assemblyPhotos[order.id]?.url || order.assemblyPhotoUrl) ? (
                          <div className="relative inline-block">
                            <img
                              src={assemblyPhotos[order.id]?.url || order.assemblyPhotoUrl!}
                              alt="Фото букета"
                              className="h-32 w-32 object-cover rounded-lg border"
                              data-testid={`img-assembly-photo-${order.id}`}
                            />
                            <button
                              className="absolute -top-2 -right-2 bg-background border rounded-full p-0.5 shadow"
                              onClick={() => setAssemblyPhotos(p => ({ ...p, [order.id]: { uploading: false, url: undefined } }))}
                              data-testid={`button-remove-photo-${order.id}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label
                            className="flex flex-col items-center justify-center gap-2 w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/60 hover:bg-muted/50 transition-colors"
                            data-testid={`label-upload-photo-${order.id}`}
                          >
                            {assemblyPhotos[order.id]?.uploading ? (
                              <span className="text-xs text-muted-foreground">Загрузка…</span>
                            ) : (
                              <>
                                <Image className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground text-center px-1">Загрузить фото</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={assemblyPhotos[order.id]?.uploading}
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAssemblyPhoto(order.id, f); }}
                              data-testid={`input-assembly-photo-${order.id}`}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {order.status === "new" && (
                        <>
                          <Button
                            size="sm"
                            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "confirmed" })}
                            disabled={updateOrderMutation.isPending}
                            data-testid={`button-accept-order-${order.id}`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            Принять заказ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "cancelled" })}
                            disabled={updateOrderMutation.isPending}
                            data-testid={`button-cancel-order-${order.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                            Отменить
                          </Button>
                        </>
                      )}
                      {order.status === "confirmed" && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            const photoUrl = assemblyPhotos[order.id]?.url || order.assemblyPhotoUrl || undefined;
                            if (!photoUrl) {
                              toast({ title: "Загрузите фото готового букета", variant: "destructive" });
                              return;
                            }
                            updateOrderMutation.mutate({ id: order.id, status: "assembling", assemblyPhotoUrl: photoUrl });
                          }}
                          disabled={updateOrderMutation.isPending || assemblyPhotos[order.id]?.uploading}
                          data-testid={`button-assembled-order-${order.id}`}
                        >
                          <Package className="w-3.5 h-3.5" />
                          Заказ собран
                        </Button>
                      )}
                      {order.status === "assembling" && (
                        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
                          {order.buyerPhotoApproval === "pending" && (
                            <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5 px-1">
                              <Clock className="w-3.5 h-3.5" />
                              Ожидание одобрения покупателя…
                            </span>
                          )}
                          {order.buyerPhotoApproval === "approved" && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1.5 px-1">
                              <Package className="w-3.5 h-3.5" />
                              Покупатель одобрил фото
                            </span>
                          )}
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "delivering" })}
                            disabled={updateOrderMutation.isPending || order.buyerPhotoApproval === "pending"}
                            data-testid={`button-delivering-order-${order.id}`}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Передать в доставку
                          </Button>
                        </div>
                      )}
                      {order.status === "delivering" && (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateOrderMutation.mutate({ id: order.id, status: "delivered" })}
                          disabled={updateOrderMutation.isPending}
                          data-testid={`button-delivered-order-${order.id}`}
                        >
                          <Package className="w-3.5 h-3.5" />
                          Заказ доставлен
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 ml-auto"
                        onClick={() => {
                          navigate(`/chat?userId=${order.buyerId}`);
                        }}
                        data-testid={`button-message-buyer-${order.id}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Написать заказчику
                      </Button>
                    </div>
                    {!["cancelled", "delivered"].includes(order.status) && (
                      <SupplementsSection orderId={order.id} />
                    )}
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

        <TabsContent value="workers">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">Сотрудники магазина</h3>
              <p className="text-sm text-muted-foreground">Добавьте сотрудников, которые смогут управлять товарами и заказами вашего магазина</p>
            </div>

            <Card>
              <CardContent className="pt-5 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Добавить сотрудника</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Email сотрудника *"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    data-testid="input-worker-email"
                  />
                  <Input
                    placeholder="Имя (если нет аккаунта)"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    data-testid="input-worker-name"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Если пользователь с таким email уже зарегистрирован — он будет добавлен в магазин. Если нет — создадим аккаунт автоматически.
                </p>
                <Button
                  onClick={() => {
                    if (!inviteEmail.trim()) return;
                    inviteWorkerMutation.mutate({ email: inviteEmail.trim(), name: inviteName.trim() || undefined });
                  }}
                  disabled={inviteWorkerMutation.isPending || !inviteEmail.trim()}
                  data-testid="button-invite-worker"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {inviteWorkerMutation.isPending ? "Добавляем..." : "Добавить сотрудника"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="font-medium">Текущие сотрудники ({workers.length})</h4>
              {workers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Сотрудников пока нет</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workers.map((w) => (
                    <Card key={w.id} className="overflow-hidden" data-testid={`card-worker-${w.userId}`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                          {w.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{w.user?.name || "Неизвестный"}</p>
                          <p className="text-xs text-muted-foreground">{w.user?.email}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">Сотрудник</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeWorkerMutation.mutate(w.userId)}
                          disabled={removeWorkerMutation.isPending}
                          data-testid={`button-remove-worker-${w.userId}`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Crown className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Права сотрудников</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Сотрудники могут управлять товарами и заказами. Настройки магазина, зоны доставки и управление сотрудниками доступны только владельцу.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <label className="text-sm font-medium">Название магазина</label>
                    <Input
                      defaultValue={myShop?.name || ""}
                      key={`name-${myShop?.name}`}
                      id="shop-name-input"
                      placeholder="Название вашего магазина"
                      data-testid="input-shop-name"
                    />
                  </div>
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
                    <label className="text-sm font-medium">Точка на карте</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Укажите местоположение магазина на карте. Координаты также определяются автоматически при сохранении адреса.
                    </p>
                    <ShopLocationMap
                      latitude={myShop?.latitude}
                      longitude={myShop?.longitude}
                      onLocationSelect={(lat, lng) => {
                        updateShopMutation.mutate({
                          latitude: lat.toString(),
                          longitude: lng.toString(),
                        });
                      }}
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
                      const name = (document.getElementById("shop-name-input") as HTMLInputElement)?.value?.trim();
                      const desc = (document.getElementById("shop-description-input") as HTMLTextAreaElement)?.value;
                      const phone = (document.getElementById("shop-phone-input") as HTMLInputElement)?.value;
                      const address = (document.getElementById("shop-address-input") as HTMLInputElement)?.value;
                      const workingHours = (document.getElementById("shop-hours-input") as HTMLInputElement)?.value;
                      const deliveryZone = (document.getElementById("shop-zone-input") as HTMLInputElement)?.value;
                      if (!name) {
                        toast({ title: "Ошибка", description: "Название магазина не может быть пустым", variant: "destructive" });
                        return;
                      }
                      updateShopMutation.mutate({ name, description: desc, phone, address, workingHours, deliveryZone });
                    }}
                    disabled={updateShopMutation.isPending}
                    data-testid="button-save-shop-info"
                  >
                    Сохранить информацию
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Telegram notifications */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold">Telegram-уведомления</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Получайте мгновенные уведомления о новых заказах, фотоотчётах и сообщениях прямо в Telegram
                </p>
                {(user as any)?.telegramChatId ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Telegram подключён</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => telegramDisconnectMutation.mutate()}
                      disabled={telegramDisconnectMutation.isPending}
                      data-testid="button-shop-telegram-disconnect"
                    >
                      Отключить
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => telegramConnectMutation.mutate()}
                    disabled={telegramConnectMutation.isPending}
                    data-testid="button-shop-telegram-connect"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {telegramConnectMutation.isPending ? "Открываем..." : "Подключить Telegram"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
