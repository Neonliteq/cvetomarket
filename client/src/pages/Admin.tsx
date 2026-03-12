import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  CheckCircle, XCircle, Users, Store, Package, Settings, Plus, Trash2,
  BarChart3, MapPin, Tag, ShieldAlert, ShieldCheck, TrendingUp, DollarSign,
  Ban, UserCheck, Eye, ChevronDown, Edit, ShoppingBag, EyeOff, FileText,
  Wallet, Receipt, Percent, ArrowDownRight, Filter, ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Shop, User, Category, City, Order, Product, PlatformSettings } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type ShopWithMeta = Shop & { cityName?: string; ownerName?: string };
type ProductWithMeta = Product & { shopName?: string; categoryName?: string };
type OrderWithMeta = Order & { buyerName?: string; shopName?: string };
type Analytics = {
  totalRevenue: number;
  monthRevenue: number;
  weekRevenue: number;
  totalCommission: number;
  totalOrders: number;
  monthOrders: number;
  weekOrders: number;
  statusCounts: Record<string, number>;
  dailyRevenue: Record<string, number>;
  topShops: { name: string; revenue: number }[];
  totalUsers: number;
  newUsers30d: number;
  buyerCount: number;
  shopOwnerCount: number;
  blockedCount: number;
  totalShops: number;
  approvedShops: number;
  pendingShops: number;
  totalProducts: number;
  avgOrderValue: number;
};

type PayoutRow = {
  shopId: string;
  shopName: string;
  commissionRate: number;
  orderCount: number;
  revenue: number;
  commission: number;
  payout: number;
};

type FinancialAnalytics = {
  totalRevenue: number;
  totalCommission: number;
  totalPayout: number;
  orderCount: number;
  daily: { date: string; revenue: number; commission: number; payout: number; orders: number }[];
  perShop: { shopId: string; shopName: string; revenue: number; commission: number; payout: number; orders: number }[];
};

const ORDER_STATUSES = [
  { value: "new", label: "Новый", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "confirmed", label: "Подтверждён", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  { value: "assembling", label: "Сборка", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "delivering", label: "Доставка", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "delivered", label: "Доставлен", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "cancelled", label: "Отменён", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
];

function getStatusLabel(status: string) {
  return ORDER_STATUSES.find((s) => s.value === status)?.label || status;
}
function getStatusColor(status: string) {
  return ORDER_STATUSES.find((s) => s.value === status)?.color || "bg-gray-100 text-gray-800";
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [commission, setCommission] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [shopFilter, setShopFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [editShopId, setEditShopId] = useState<string | null>(null);
  const [editShopData, setEditShopData] = useState<Record<string, string>>({});
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState<Record<string, string>>({});
  const [editCommissionShopId, setEditCommissionShopId] = useState<string | null>(null);
  const [editCommissionValue, setEditCommissionValue] = useState("");
  const [financeShopFilter, setFinanceShopFilter] = useState("all");
  const [financePeriod, setFinancePeriod] = useState("month");

  const isAdmin = !!user && user.role === "admin";

  const { data: shops, isLoading: loadingShops } = useQuery<ShopWithMeta[]>({
    queryKey: ["/api/admin/shops"],
    enabled: isAdmin,
  });
  const { data: users, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });
  const { data: orders, isLoading: loadingOrders } = useQuery<OrderWithMeta[]>({
    queryKey: ["/api/admin/orders"],
    enabled: isAdmin,
  });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: cities } = useQuery<City[]>({ queryKey: ["/api/cities"] });
  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/admin/settings"],
    enabled: isAdmin,
  });
  const { data: allProducts, isLoading: loadingProducts } = useQuery<ProductWithMeta[]>({
    queryKey: ["/api/admin/products"],
    enabled: isAdmin,
  });
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
    enabled: isAdmin,
  });
  const { data: payouts, isLoading: loadingPayouts } = useQuery<PayoutRow[]>({
    queryKey: ["/api/admin/payouts"],
    enabled: isAdmin,
  });
  const finQueryKey = ["/api/admin/financial-analytics", financeShopFilter, financePeriod];
  const { data: finAnalytics, isLoading: loadingFin } = useQuery<FinancialAnalytics>({
    queryKey: finQueryKey,
    queryFn: () => fetch(`/api/admin/financial-analytics?shopId=${financeShopFilter}&period=${financePeriod}`, { credentials: "include" }).then((r) => r.json()),
    enabled: isAdmin,
  });

  const moderateShopMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/admin/shops/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Статус магазина обновлён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/users/${id}/block`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Статус заказа обновлён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/categories", { name: newCategoryName, slug: newCategorySlug }),
    onSuccess: () => {
      setNewCategoryName("");
      setNewCategorySlug("");
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Категория добавлена" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/categories/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/categories"] }),
    onError: () => toast({ title: "Невозможно удалить категорию", description: "Она используется товарами", variant: "destructive" }),
  });

  const addCityMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/cities", { name: newCityName }),
    onSuccess: () => {
      setNewCityName("");
      qc.invalidateQueries({ queryKey: ["/api/cities"] });
      toast({ title: "Город добавлен" });
    },
  });

  const deleteCityMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cities/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/cities"] }),
    onError: () => toast({ title: "Невозможно удалить город", description: "Он используется магазинами", variant: "destructive" }),
  });

  const deleteShopMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/shops/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Магазин удалён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
    onError: () => toast({ title: "Невозможно удалить магазин", description: "У него есть связанные данные", variant: "destructive" }),
  });

  const editShopMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => apiRequest("PATCH", `/api/admin/shops/${id}`, data),
    onSuccess: () => {
      toast({ title: "Магазин обновлён" });
      setEditShopId(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
    },
  });

  const adminDeleteProductMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/products/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Товар удалён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/products"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
  });

  const adminEditProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => apiRequest("PATCH", `/api/admin/products/${id}`, data),
    onSuccess: () => {
      toast({ title: "Товар обновлён" });
      setEditProductId(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/products"] });
    },
  });

  const adminToggleProductMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/products/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/products"] }),
  });

  const setShopCommissionMutation = useMutation({
    mutationFn: ({ id, commissionRate }: { id: string; commissionRate: string }) =>
      apiRequest("PATCH", `/api/admin/shops/${id}/commission`, { commissionRate: commissionRate === "" ? null : commissionRate }),
    onSuccess: () => {
      toast({ title: "Комиссия магазина обновлена" });
      setEditCommissionShopId(null);
      setEditCommissionValue("");
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () => {
      const payload: any = {};
      if (commission) payload.commissionRate = commission;
      if (deliveryCost) payload.deliveryCost = deliveryCost;
      return apiRequest("PATCH", "/api/admin/settings", payload);
    },
    onSuccess: () => {
      toast({ title: "Настройки сохранены" });
      setCommission("");
      setDeliveryCost("");
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
  });

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const pendingShops = (shops || []).filter((s) => s.status === "pending");
  const filteredShops = shopFilter === "all" ? shops : shops?.filter((s) => s.status === shopFilter);
  const filteredOrders = orderFilter === "all" ? orders : orders?.filter((o) => o.status === orderFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Панель администратора</h1>
        <p className="text-muted-foreground text-sm mt-1">Управление платформой ЦветоМаркет</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Магазины", value: shops?.length || 0, sub: pendingShops.length > 0 ? `${pendingShops.length} на модерации` : undefined, icon: Store },
          { title: "Пользователи", value: users?.length || 0, icon: Users },
          { title: "Заказы", value: orders?.length || 0, icon: Package },
          { title: "Оборот", value: `${(analytics?.totalRevenue || 0).toLocaleString("ru")} ₽`, icon: TrendingUp },
        ].map((s) => (
          <Card key={s.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.title}</p>
                <p className="text-lg font-bold" data-testid={`text-stat-${s.title}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-amber-500">{s.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="shops">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="shops" data-testid="tab-shops">
            <Store className="w-4 h-4 mr-1.5" />
            Магазины {pendingShops.length > 0 && <Badge className="ml-1.5">{pendingShops.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-1.5" />
            Пользователи
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <Package className="w-4 h-4 mr-1.5" />
            Заказы
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            Товары
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Tag className="w-4 h-4 mr-1.5" />
            Категории
          </TabsTrigger>
          <TabsTrigger value="cities" data-testid="tab-cities">
            <MapPin className="w-4 h-4 mr-1.5" />
            Города
          </TabsTrigger>
          <TabsTrigger value="payouts" data-testid="tab-payouts">
            <Wallet className="w-4 h-4 mr-1.5" />
            Выплаты
          </TabsTrigger>
          <TabsTrigger value="finances" data-testid="tab-finances">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Финансы
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Аналитика
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-1.5" />
            Настройки
          </TabsTrigger>
        </TabsList>

        {/* ==================== SHOPS ==================== */}
        <TabsContent value="shops">
          <div className="flex items-center gap-3 mb-4">
            <Select value={shopFilter} onValueChange={setShopFilter}>
              <SelectTrigger className="w-48" data-testid="select-shop-filter">
                <SelectValue placeholder="Все магазины" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все магазины</SelectItem>
                <SelectItem value="pending">На модерации</SelectItem>
                <SelectItem value="approved">Одобренные</SelectItem>
                <SelectItem value="rejected">Отклонённые</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Показано: {filteredShops?.length || 0}
            </span>
          </div>
          {loadingShops ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : filteredShops?.length ? (
            <div className="space-y-3">
              {filteredShops.map((shop) => (
                <Card key={shop.id} data-testid={`card-shop-${shop.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{shop.name}</p>
                          <Badge variant={shop.status === "approved" ? "default" : shop.status === "pending" ? "secondary" : "destructive"}>
                            {shop.status === "approved" ? "Одобрен" : shop.status === "pending" ? "На модерации" : "Отклонён"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {shop.cityName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{shop.cityName}</span>}
                          {shop.ownerName && <span>Владелец: {shop.ownerName}</span>}
                          {shop.email && <span>{shop.email}</span>}
                          {shop.phone && <span>{shop.phone}</span>}
                        </div>
                        {(shop.inn || shop.ogrn || shop.legalName) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5 p-2 bg-muted/50 rounded-md">
                            <span className="font-semibold">Юр. данные:</span>
                            {shop.legalType && <span>{shop.legalType === "ip" ? "ИП" : shop.legalType === "ooo" ? "ООО" : "Самозанятый"}</span>}
                            {shop.legalName && <span>{shop.legalName}</span>}
                            {shop.inn && <span>ИНН: {shop.inn}</span>}
                            {shop.ogrn && <span>ОГРН: {shop.ogrn}</span>}
                            {shop.legalAddress && <span>Юр. адрес: {shop.legalAddress}</span>}
                          </div>
                        )}
                        {shop.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{shop.description}</p>
                        )}
                        {shop.address && (
                          <p className="text-xs text-muted-foreground mt-1">{shop.address}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {editCommissionShopId === shop.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min="0" max="100" step="0.5"
                                value={editCommissionValue}
                                onChange={(e) => setEditCommissionValue(e.target.value)}
                                placeholder="% (пусто = глобальная)"
                                className="h-7 w-36 text-xs"
                                data-testid={`input-commission-shop-${shop.id}`}
                              />
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => setShopCommissionMutation.mutate({ id: shop.id, commissionRate: editCommissionValue })} disabled={setShopCommissionMutation.isPending}>
                                Сохранить
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditCommissionShopId(null); setEditCommissionValue(""); }}>
                                Отмена
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => { setEditCommissionShopId(shop.id); setEditCommissionValue(shop.commissionRate?.toString() || ""); }}
                              data-testid={`button-commission-shop-${shop.id}`}
                            >
                              <Percent className="w-3 h-3" />
                              {shop.commissionRate != null
                                ? <span className="font-medium text-primary">Комиссия: {shop.commissionRate}% (индивидуальная)</span>
                                : <span>Комиссия: глобальная ({settings?.commissionRate || "10"}%)</span>
                              }
                              <Edit className="w-3 h-3 ml-0.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex gap-2">
                          {shop.status !== "approved" && (
                            <Button
                              size="sm"
                              onClick={() => moderateShopMutation.mutate({ id: shop.id, status: "approved" })}
                              className="gap-1.5"
                              disabled={moderateShopMutation.isPending}
                              data-testid={`button-approve-${shop.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Одобрить
                            </Button>
                          )}
                          {shop.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moderateShopMutation.mutate({ id: shop.id, status: "rejected" })}
                              className="gap-1.5 text-destructive"
                              disabled={moderateShopMutation.isPending}
                              data-testid={`button-reject-${shop.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Отклонить
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Dialog open={editShopId === shop.id} onOpenChange={(o) => {
                            if (o) {
                              setEditShopId(shop.id);
                              setEditShopData({
                                name: shop.name,
                                description: shop.description || "",
                                phone: shop.phone || "",
                                email: shop.email || "",
                                address: shop.address || "",
                                workingHours: shop.workingHours || "",
                                deliveryPrice: shop.deliveryPrice?.toString() || "",
                                inn: shop.inn || "",
                                ogrn: shop.ogrn || "",
                                legalName: shop.legalName || "",
                                legalAddress: shop.legalAddress || "",
                                legalType: shop.legalType || "",
                                logoUrl: shop.logoUrl || "",
                                coverUrl: shop.coverUrl || "",
                                status: shop.status || "",
                              });
                            } else setEditShopId(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1.5" data-testid={`button-edit-shop-${shop.id}`}>
                                <Edit className="w-3.5 h-3.5" /> Изменить
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                              <DialogHeader><DialogTitle>Редактировать магазин</DialogTitle></DialogHeader>
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Основное</p>
                                <div><Label>Название</Label><Input value={editShopData.name || ""} onChange={(e) => setEditShopData({ ...editShopData, name: e.target.value })} data-testid="input-admin-shop-name" /></div>
                                <div><Label>Описание</Label><Textarea rows={2} value={editShopData.description || ""} onChange={(e) => setEditShopData({ ...editShopData, description: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label>Телефон</Label><Input value={editShopData.phone || ""} onChange={(e) => setEditShopData({ ...editShopData, phone: e.target.value })} /></div>
                                  <div><Label>Email</Label><Input value={editShopData.email || ""} onChange={(e) => setEditShopData({ ...editShopData, email: e.target.value })} /></div>
                                </div>
                                <div><Label>Адрес</Label><Input value={editShopData.address || ""} onChange={(e) => setEditShopData({ ...editShopData, address: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label>Режим работы</Label><Input placeholder="09:00-20:00" value={editShopData.workingHours || ""} onChange={(e) => setEditShopData({ ...editShopData, workingHours: e.target.value })} /></div>
                                  <div><Label>Стоимость доставки (₽)</Label><Input type="number" value={editShopData.deliveryPrice || ""} onChange={(e) => setEditShopData({ ...editShopData, deliveryPrice: e.target.value })} /></div>
                                </div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Юридические данные</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label>ИНН</Label><Input value={editShopData.inn || ""} onChange={(e) => setEditShopData({ ...editShopData, inn: e.target.value })} /></div>
                                  <div><Label>ОГРН / ОГРНИП</Label><Input value={editShopData.ogrn || ""} onChange={(e) => setEditShopData({ ...editShopData, ogrn: e.target.value })} /></div>
                                </div>
                                <div><Label>Юр. наименование</Label><Input value={editShopData.legalName || ""} onChange={(e) => setEditShopData({ ...editShopData, legalName: e.target.value })} /></div>
                                <div><Label>Юр. адрес</Label><Input value={editShopData.legalAddress || ""} onChange={(e) => setEditShopData({ ...editShopData, legalAddress: e.target.value })} /></div>
                                <div>
                                  <Label>Организационная форма</Label>
                                  <Select value={editShopData.legalType || ""} onValueChange={(v) => setEditShopData({ ...editShopData, legalType: v })}>
                                    <SelectTrigger><SelectValue placeholder="Выбрать" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ip">ИП</SelectItem>
                                      <SelectItem value="ooo">ООО</SelectItem>
                                      <SelectItem value="self">Самозанятый</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Медиа</p>
                                <div><Label>URL логотипа</Label><Input placeholder="https://..." value={editShopData.logoUrl || ""} onChange={(e) => setEditShopData({ ...editShopData, logoUrl: e.target.value })} /></div>
                                <div><Label>URL обложки</Label><Input placeholder="https://..." value={editShopData.coverUrl || ""} onChange={(e) => setEditShopData({ ...editShopData, coverUrl: e.target.value })} /></div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Статус</p>
                                <div>
                                  <Select value={editShopData.status || ""} onValueChange={(v) => setEditShopData({ ...editShopData, status: v })}>
                                    <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approved">Одобрен</SelectItem>
                                      <SelectItem value="pending">На модерации</SelectItem>
                                      <SelectItem value="rejected">Отклонён</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={() => {
                                  const data: Record<string, any> = {
                                    ...editShopData,
                                    deliveryPrice: editShopData.deliveryPrice !== "" ? Number(editShopData.deliveryPrice) : null,
                                  };
                                  editShopMutation.mutate({ id: shop.id, data });
                                }} disabled={editShopMutation.isPending} className="w-full">
                                  Сохранить изменения
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive"
                            onClick={() => { if (confirm("Удалить магазин?")) deleteShopMutation.mutate(shop.id); }}
                            disabled={deleteShopMutation.isPending}
                            data-testid={`button-delete-shop-${shop.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Удалить
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Нет магазинов</div>
          )}
        </TabsContent>

        {/* ==================== USERS ==================== */}
        <TabsContent value="users">
          {loadingUsers ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-2">
              {users?.map((u) => (
                <Card key={u.id} data-testid={`card-user-${u.id}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{u.name}</p>
                        {u.isBlocked && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <Ban className="w-3 h-3" /> Заблокирован
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                        <span>{u.email}</span>
                        {u.phone && <span>{u.phone}</span>}
                        {u.createdAt && <span>Регистрация: {format(new Date(u.createdAt), "d MMM yyyy", { locale: ru })}</span>}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {u.role === "admin" ? "Админ" : u.role === "shop" ? "Продавец" : "Покупатель"}
                    </Badge>
                    {u.role !== "admin" && (
                      <Button
                        size="sm"
                        variant={u.isBlocked ? "default" : "destructive"}
                        onClick={() => blockUserMutation.mutate(u.id)}
                        disabled={blockUserMutation.isPending}
                        className="gap-1.5"
                        data-testid={`button-block-${u.id}`}
                      >
                        {u.isBlocked ? (
                          <><UserCheck className="w-3.5 h-3.5" /> Разблокировать</>
                        ) : (
                          <><Ban className="w-3.5 h-3.5" /> Заблокировать</>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ==================== ORDERS ==================== */}
        <TabsContent value="orders">
          <div className="flex items-center gap-3 mb-4">
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-48" data-testid="select-order-filter">
                <SelectValue placeholder="Все заказы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все заказы</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Показано: {filteredOrders?.length || 0}
            </span>
          </div>
          {loadingOrders ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : filteredOrders?.length ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          {order.buyerName && <span>Покупатель: {order.buyerName}</span>}
                          {order.shopName && <span>Магазин: {order.shopName}</span>}
                          {order.createdAt && <span>{format(new Date(order.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span>Получатель: {order.recipientName}</span>
                          <span>Тел: {order.recipientPhone}</span>
                          <span>Адрес: {order.deliveryAddress}</span>
                        </div>
                        {Number(order.platformCommission) > 0 && (
                          <p className="text-xs text-green-600 mt-1">Комиссия: {Number(order.platformCommission).toLocaleString("ru-RU")} ₽</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className="font-bold">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</p>
                        <Select
                          value={order.status}
                          onValueChange={(status) => updateOrderStatusMutation.mutate({ id: order.id, status })}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs" data-testid={`select-order-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Нет заказов</div>
          )}
        </TabsContent>

        {/* ==================== PRODUCTS ==================== */}
        <TabsContent value="products">
          {loadingProducts ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : allProducts?.length ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">Все товары на платформе: {allProducts.length}</p>
              {allProducts.map((p) => (
                <Card key={p.id} className={!p.isActive ? "opacity-60" : ""} data-testid={`card-admin-product-${p.id}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                      <img src={p.images?.[0] || "/images/placeholder-bouquet.png"} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-bold text-foreground">{Number(p.price).toLocaleString("ru-RU")} ₽</span>
                        {p.shopName && <span>Магазин: {p.shopName}</span>}
                        {p.categoryName && <span>{p.categoryName}</span>}
                        <Badge variant={p.isActive ? "outline" : "secondary"} className="text-xs">{p.isActive ? "Активен" : "Скрыт"}</Badge>
                        <Badge variant={p.inStock ? "default" : "secondary"} className="text-xs">{p.inStock ? "В наличии" : "Нет"}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => adminToggleProductMutation.mutate({ id: p.id, isActive: !p.isActive })}
                        data-testid={`button-admin-toggle-${p.id}`}
                      >
                        {p.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Dialog open={editProductId === p.id} onOpenChange={(o) => {
                        if (o) {
                          setEditProductId(p.id);
                          setEditProductData({
                            name: p.name,
                            price: p.price?.toString() || "",
                            description: p.description || "",
                            composition: p.composition || "",
                            assemblyTime: p.assemblyTime?.toString() || "",
                            discountPercent: p.discountPercent?.toString() || "0",
                            categoryId: p.categoryId || "",
                            type: p.type || "bouquet",
                            inStock: p.inStock ? "true" : "false",
                            isActive: p.isActive ? "true" : "false",
                            isRecommended: p.isRecommended ? "true" : "false",
                            tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
                          });
                        } else setEditProductId(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-admin-edit-${p.id}`}><Edit className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Редактировать товар</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Основное</p>
                            <div><Label>Название</Label><Input value={editProductData.name || ""} onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })} data-testid="input-admin-product-name" /></div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><Label>Цена (₽)</Label><Input type="number" value={editProductData.price || ""} onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })} /></div>
                              <div><Label>Скидка (%)</Label><Input type="number" min="0" max="100" value={editProductData.discountPercent || "0"} onChange={(e) => setEditProductData({ ...editProductData, discountPercent: e.target.value })} /></div>
                            </div>
                            <div><Label>Описание</Label><Textarea rows={2} value={editProductData.description || ""} onChange={(e) => setEditProductData({ ...editProductData, description: e.target.value })} /></div>
                            <div><Label>Состав</Label><Textarea rows={2} value={editProductData.composition || ""} onChange={(e) => setEditProductData({ ...editProductData, composition: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>Категория</Label>
                                <Select value={editProductData.categoryId || ""} onValueChange={(v) => setEditProductData({ ...editProductData, categoryId: v })}>
                                  <SelectTrigger><SelectValue placeholder="Без категории" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Без категории</SelectItem>
                                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Тип</Label>
                                <Select value={editProductData.type || "bouquet"} onValueChange={(v) => setEditProductData({ ...editProductData, type: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="bouquet">Букет</SelectItem>
                                    <SelectItem value="gift">Подарок</SelectItem>
                                    <SelectItem value="tasty_gift">Вкусный подарок</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div><Label>Время сборки (мин)</Label><Input type="number" value={editProductData.assemblyTime || ""} onChange={(e) => setEditProductData({ ...editProductData, assemblyTime: e.target.value })} /></div>
                            <div><Label>Теги (через запятую)</Label><Input placeholder="роза, красный, свадьба" value={editProductData.tags || ""} onChange={(e) => setEditProductData({ ...editProductData, tags: e.target.value })} /></div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Статусы</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label>В наличии</Label>
                                <Select value={editProductData.inStock || "true"} onValueChange={(v) => setEditProductData({ ...editProductData, inStock: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Да</SelectItem>
                                    <SelectItem value="false">Нет</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Активен</Label>
                                <Select value={editProductData.isActive || "true"} onValueChange={(v) => setEditProductData({ ...editProductData, isActive: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Да</SelectItem>
                                    <SelectItem value="false">Нет</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Рекомендован</Label>
                                <Select value={editProductData.isRecommended || "false"} onValueChange={(v) => setEditProductData({ ...editProductData, isRecommended: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Да</SelectItem>
                                    <SelectItem value="false">Нет</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button onClick={() => {
                              const data: Record<string, any> = {
                                ...editProductData,
                                price: editProductData.price ? parseInt(editProductData.price) : undefined,
                                discountPercent: editProductData.discountPercent ? parseInt(editProductData.discountPercent) : 0,
                                assemblyTime: editProductData.assemblyTime ? parseInt(editProductData.assemblyTime) : undefined,
                                inStock: editProductData.inStock === "true",
                                isActive: editProductData.isActive === "true",
                                isRecommended: editProductData.isRecommended === "true",
                                categoryId: editProductData.categoryId || null,
                                tags: editProductData.tags ? editProductData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
                              };
                              adminEditProductMutation.mutate({ id: p.id, data });
                            }} disabled={adminEditProductMutation.isPending} className="w-full">
                              Сохранить изменения
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="icon" variant="ghost" className="text-destructive"
                        onClick={() => { if (confirm("Удалить товар?")) adminDeleteProductMutation.mutate(p.id); }}
                        data-testid={`button-admin-delete-${p.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Нет товаров</div>
          )}
        </TabsContent>

        {/* ==================== CATEGORIES ==================== */}
        <TabsContent value="categories">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">Добавить категорию</h3>
                <div className="flex gap-3">
                  <Input placeholder="Название категории" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} data-testid="input-category-name" />
                  <Input placeholder="slug (birthday)" value={newCategorySlug} onChange={(e) => setNewCategorySlug(e.target.value)} data-testid="input-category-slug" />
                  <Button onClick={() => addCategoryMutation.mutate()} disabled={!newCategoryName || !newCategorySlug || addCategoryMutation.isPending} data-testid="button-add-category">
                    <Plus className="w-4 h-4 mr-1.5" /> Добавить
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {categories?.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.slug}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCategoryMutation.mutate(c.id)} data-testid={`button-delete-cat-${c.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {!categories?.length && <p className="text-center text-sm text-muted-foreground py-8">Нет категорий</p>}
            </div>
          </div>
        </TabsContent>

        {/* ==================== CITIES ==================== */}
        <TabsContent value="cities">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">Добавить город</h3>
                <div className="flex gap-3">
                  <Input placeholder="Название города" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} data-testid="input-city-name" />
                  <Button onClick={() => addCityMutation.mutate()} disabled={!newCityName || addCityMutation.isPending} data-testid="button-add-city">
                    <Plus className="w-4 h-4 mr-1.5" /> Добавить
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {cities?.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="flex-1 font-medium text-sm">{c.name}</p>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCityMutation.mutate(c.id)} data-testid={`button-delete-city-${c.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {!cities?.length && <p className="text-center text-sm text-muted-foreground py-8">Нет городов</p>}
            </div>
          </div>
        </TabsContent>

        {/* ==================== PAYOUTS ==================== */}
        <TabsContent value="payouts">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">Выплаты магазинам</h3>
              <p className="text-sm text-muted-foreground">Сводка по каждому магазину: оборот, комиссия платформы и сумма к выплате</p>
            </div>

            {loadingPayouts ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
            ) : payouts && payouts.length > 0 ? (
              <>
                {/* Totals summary bar */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Общий оборот", value: payouts.reduce((s, p) => s + p.revenue, 0), color: "text-foreground" },
                    { label: "Комиссия платформы", value: payouts.reduce((s, p) => s + p.commission, 0), color: "text-green-600 dark:text-green-400" },
                    { label: "К выплате магазинам", value: payouts.reduce((s, p) => s + p.payout, 0), color: "text-primary" },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                        <p className={`text-xl font-bold ${item.color}`} data-testid={`text-payout-total-${item.label}`}>
                          {item.value.toLocaleString("ru-RU")} ₽
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Per-shop table */}
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Магазин</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Заказов</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ставка</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Оборот</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground text-green-600">Комиссия</th>
                          <th className="text-right px-4 py-3 font-medium text-primary">К выплате</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((row) => (
                          <tr key={row.shopId} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-payout-${row.shopId}`}>
                            <td className="px-4 py-3 font-medium">{row.shopName}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{row.orderCount}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge variant="outline" className="text-xs font-mono">{row.commissionRate}%</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{row.revenue.toLocaleString("ru-RU")} ₽</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">{row.commission.toLocaleString("ru-RU")} ₽</td>
                            <td className="px-4 py-3 text-right font-bold text-primary">{row.payout.toLocaleString("ru-RU")} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground">* Данные по всем заказам кроме отменённых. Для изменения ставки комиссии магазина перейдите во вкладку «Магазины».</p>
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p>Нет данных для выплат</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ==================== FINANCES ==================== */}
        <TabsContent value="finances">
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={financeShopFilter} onValueChange={setFinanceShopFilter}>
                  <SelectTrigger className="w-48" data-testid="select-finance-shop">
                    <SelectValue placeholder="Все магазины" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все магазины</SelectItem>
                    {shops?.filter((s) => s.status === "approved").map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={financePeriod} onValueChange={setFinancePeriod}>
                <SelectTrigger className="w-40" data-testid="select-finance-period">
                  <SelectValue placeholder="Период" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Неделя</SelectItem>
                  <SelectItem value="month">Месяц</SelectItem>
                  <SelectItem value="quarter">Квартал</SelectItem>
                  <SelectItem value="year">Год</SelectItem>
                  <SelectItem value="all">Всё время</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingFin ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
                <Skeleton className="h-40 rounded-lg" />
              </div>
            ) : finAnalytics ? (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Оборот", value: finAnalytics.totalRevenue, color: "text-foreground", icon: TrendingUp },
                    { label: "Комиссия платформы", value: finAnalytics.totalCommission, color: "text-green-600 dark:text-green-400", icon: Receipt },
                    { label: "К выплате", value: finAnalytics.totalPayout, color: "text-primary", icon: Wallet },
                    { label: "Заказов", value: finAnalytics.orderCount, color: "text-foreground", icon: Package, isCount: true },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                        <p className={`text-xl font-bold ${item.color}`} data-testid={`text-fin-${item.label}`}>
                          {(item as any).isCount ? item.value : `${item.value.toLocaleString("ru-RU")} ₽`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Daily chart */}
                {finAnalytics.daily.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Оборот / комиссия по дням</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {(() => {
                          const maxVal = Math.max(...finAnalytics.daily.map((d) => d.revenue), 1);
                          return finAnalytics.daily.map((d) => (
                            <div key={d.date} className="flex items-center gap-2 group" data-testid={`bar-fin-${d.date}`}>
                              <span className="text-xs text-muted-foreground w-24 shrink-0">
                                {format(new Date(d.date), "d MMM", { locale: ru })}
                              </span>
                              <div className="flex-1 relative h-6 bg-muted rounded overflow-hidden">
                                <div
                                  className="absolute inset-y-0 left-0 bg-primary/20 rounded"
                                  style={{ width: `${(d.revenue / maxVal) * 100}%` }}
                                />
                                <div
                                  className="absolute inset-y-0 left-0 bg-green-500/40 rounded"
                                  style={{ width: `${(d.commission / maxVal) * 100}%` }}
                                />
                              </div>
                              <div className="text-xs text-right shrink-0 w-32 hidden group-hover:flex gap-2 absolute right-4 bg-popover border rounded px-2 py-1 shadow-sm z-10">
                                <span>{d.revenue.toLocaleString("ru-RU")} ₽</span>
                              </div>
                              <span className="text-xs font-medium w-28 text-right shrink-0">
                                {d.revenue.toLocaleString("ru-RU")} ₽
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/20 inline-block" />Оборот</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/40 inline-block" />Комиссия</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">Нет данных за выбранный период</CardContent>
                  </Card>
                )}

                {/* Per-shop breakdown (only when "all shops" selected) */}
                {financeShopFilter === "all" && finAnalytics.perShop.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">По магазинам</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Магазин</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Заказов</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Оборот</th>
                            <th className="text-right px-4 py-2 font-medium text-green-600">Комиссия</th>
                            <th className="text-right px-4 py-2 font-medium text-primary">К выплате</th>
                          </tr>
                        </thead>
                        <tbody>
                          {finAnalytics.perShop.map((row) => (
                            <tr key={row.shopId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2 font-medium">{row.shopName}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{row.orders}</td>
                              <td className="px-4 py-2 text-right">{row.revenue.toLocaleString("ru-RU")} ₽</td>
                              <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">{row.commission.toLocaleString("ru-RU")} ₽</td>
                              <td className="px-4 py-2 text-right font-bold text-primary">{row.payout.toLocaleString("ru-RU")} ₽</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p>Нет данных</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ==================== ANALYTICS ==================== */}
        <TabsContent value="analytics">
          {loadingAnalytics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Общий оборот</p>
                    <p className="text-xl font-bold" data-testid="text-analytics-total-revenue">{analytics.totalRevenue.toLocaleString("ru-RU")} ₽</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">За месяц</p>
                    <p className="text-xl font-bold">{analytics.monthRevenue.toLocaleString("ru-RU")} ₽</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">За неделю</p>
                    <p className="text-xl font-bold">{analytics.weekRevenue.toLocaleString("ru-RU")} ₽</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Комиссия платформы</p>
                    <p className="text-xl font-bold text-green-600">{analytics.totalCommission.toLocaleString("ru-RU")} ₽</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Средний чек</p>
                    <p className="text-xl font-bold">{analytics.avgOrderValue.toLocaleString("ru-RU")} ₽</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Товаров</p>
                    <p className="text-xl font-bold">{analytics.totalProducts}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Новых за 30 дней</p>
                    <p className="text-xl font-bold">{analytics.newUsers30d} пользователей</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Заблокировано</p>
                    <p className="text-xl font-bold text-destructive">{analytics.blockedCount}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Статусы заказов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ORDER_STATUSES.map((s) => {
                        const count = analytics.statusCounts[s.value] || 0;
                        const total = analytics.totalOrders || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={s.value} className="flex items-center gap-3" data-testid={`analytics-status-${s.value}`}>
                            <span className="text-sm w-24">{s.label}</span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${s.color} flex items-center px-2 text-xs font-medium transition-all`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              >
                                {count > 0 && count}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Топ магазинов по выручке</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.topShops.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.topShops.map((shop, i) => (
                          <div key={shop.name} className="flex items-center gap-3" data-testid={`analytics-top-shop-${i}`}>
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="flex-1 text-sm font-medium truncate">{shop.name}</span>
                            <span className="text-sm font-bold">{shop.revenue.toLocaleString("ru-RU")} ₽</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет данных</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Пользователи</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold">{analytics.buyerCount}</p>
                        <p className="text-xs text-muted-foreground">Покупателей</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics.shopOwnerCount}</p>
                        <p className="text-xs text-muted-foreground">Продавцов</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Магазины</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-2xl font-bold">{analytics.totalShops}</p>
                        <p className="text-xs text-muted-foreground">Всего</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{analytics.approvedShops}</p>
                        <p className="text-xs text-muted-foreground">Активных</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-500">{analytics.pendingShops}</p>
                        <p className="text-xs text-muted-foreground">На модерации</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {Object.keys(analytics.dailyRevenue).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Выручка по дням (последние 30 дней)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-32">
                      {(() => {
                        const entries = Object.entries(analytics.dailyRevenue).sort(([a], [b]) => a.localeCompare(b));
                        const maxVal = Math.max(...entries.map(([, v]) => v), 1);
                        return entries.map(([day, val]) => (
                          <div
                            key={day}
                            className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors group relative"
                            style={{ height: `${(val / maxVal) * 100}%`, minHeight: "4px" }}
                            title={`${format(new Date(day), "d MMM", { locale: ru })}: ${val.toLocaleString("ru-RU")} ₽`}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {val.toLocaleString("ru-RU")} ₽
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Нет данных</div>
          )}
        </TabsContent>

        {/* ==================== SETTINGS ==================== */}
        <TabsContent value="settings">
          <Card>
            <CardContent className="p-5 space-y-6">
              <h3 className="font-semibold">Настройки платформы</h3>
              <div className="space-y-2">
                <Label>Комиссия платформы (%)</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="number"
                    placeholder={settings?.commissionRate?.toString() || "10"}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="max-w-32"
                    data-testid="input-commission"
                  />
                  {settings && (
                    <span className="text-sm text-muted-foreground">Текущая: {settings.commissionRate}%</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Стоимость доставки (₽)</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="number"
                    placeholder={settings?.deliveryCost?.toString() || "300"}
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    className="max-w-32"
                    data-testid="input-delivery-cost"
                  />
                  {settings && (
                    <span className="text-sm text-muted-foreground">Текущая: {settings.deliveryCost} ₽</span>
                  )}
                </div>
              </div>
              <Button
                onClick={() => updateSettingsMutation.mutate()}
                disabled={(!commission && !deliveryCost) || updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                Сохранить настройки
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
