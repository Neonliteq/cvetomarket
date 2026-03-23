import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  CheckCircle, XCircle, Users, Store, Package, Settings, Plus, Trash2,
  BarChart3, MapPin, Tag, ShieldAlert, ShieldCheck, TrendingUp, DollarSign,
  Ban, UserCheck, Eye, ChevronDown, Edit, ShoppingBag, EyeOff, FileText,
  Wallet, Receipt, Percent, ArrowDownRight, Filter, ChevronsUpDown, Gift,
  Star, Award, MessageSquare, AlertCircle, ChevronRight, Search, StickyNote
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Shop, User, Category, City, Order, Product, PlatformSettings } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type ShopWithMeta = Shop & { cityName?: string; ownerName?: string };
type ProductWithMeta = Product & { shopName?: string; categoryName?: string };
type OrderWithMeta = Order & { buyerName?: string; shopName?: string };

type CRMSegment = "new" | "active" | "vip" | "churned";
type CRMCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bonusBalance: number;
  orderCount: number;
  ltv: number;
  lastOrderAt: string | null;
  segment: CRMSegment;
  cityName: string | null;
  adminNotes: string | null;
  createdAt: string | null;
};
type CRMProfile = {
  orders: any[];
  reviews: any[];
  bonusTransactions: any[];
  bonusBalance: number;
};

const CRM_SEGMENT_LABELS: Record<CRMSegment, string> = {
  new: "Новый",
  active: "Активный",
  vip: "VIP",
  churned: "Отток",
};
const CRM_SEGMENT_COLORS: Record<CRMSegment, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vip: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  churned: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
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

const BONUS_REASON_LABELS: Record<string, string> = {
  first_order: "Первый заказ",
  purchase_milestone: "Бонус за покупку",
  first_review: "Первый отзыв",
  referral: "Реферальный бонус",
  admin_grant: "Начисление",
  order_spend: "Списание",
};

function AdminBonusCard({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<{ balance: number; transactions: any[] }>({
    queryKey: ["/api/admin/users", userId, "bonuses"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/bonuses`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-20 rounded-lg" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Gift className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Текущий баланс</div>
          <div className="text-xl font-bold" data-testid="text-admin-bonus-balance">{data?.balance || 0} бонусов</div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">История транзакций</h4>
        {!data?.transactions?.length ? (
          <p className="text-xs text-muted-foreground">Нет операций</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.transactions.map((t: any) => (
              <div key={t.id} className="flex justify-between items-start text-xs border-b pb-1.5 last:border-0" data-testid={`admin-bonus-txn-${t.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.description || BONUS_REASON_LABELS[t.reason] || t.reason}</div>
                  <div className="text-muted-foreground">
                    {t.createdAt ? format(new Date(t.createdAt), "d MMM yyyy, HH:mm", { locale: ru }) : ""}
                    {t.amount > 0 && t.expiresAt && (
                      <span className="ml-2 text-amber-600">
                        сгорает {format(new Date(t.expiresAt), "d MMM yyyy", { locale: ru })}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={t.amount > 0 ? "default" : "destructive"} className="shrink-0 ml-2">
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
  const [orderSearch, setOrderSearch] = useState("");
  const [editShopId, setEditShopId] = useState<string | null>(null);
  const [editShopData, setEditShopData] = useState<Record<string, string>>({});
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState<Record<string, string>>({});
  const [editCommissionShopId, setEditCommissionShopId] = useState<string | null>(null);
  const [editCommissionValue, setEditCommissionValue] = useState("");
  const [financeShopFilter, setFinanceShopFilter] = useState("all");
  const [financePeriod, setFinancePeriod] = useState("month");
  const [crmSearch, setCrmSearch] = useState("");
  const [crmSegmentFilter, setCrmSegmentFilter] = useState("all");
  const [crmCityFilter, setCrmCityFilter] = useState("all");
  const [crmSelectedCustomer, setCrmSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [crmNotes, setCrmNotes] = useState("");
  const [crmGrantAmount, setCrmGrantAmount] = useState("");
  const [crmGrantDesc, setCrmGrantDesc] = useState("");
  const [crmGrantOpen, setCrmGrantOpen] = useState(false);

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
  const { data: adminReviews, isLoading: loadingReviews } = useQuery<any[]>({
    queryKey: ["/api/admin/reviews"],
    enabled: isAdmin,
  });
  const finQueryKey = ["/api/admin/financial-analytics", financeShopFilter, financePeriod];
  const { data: finAnalytics, isLoading: loadingFin } = useQuery<FinancialAnalytics>({
    queryKey: finQueryKey,
    queryFn: () => fetch(`/api/admin/financial-analytics?shopId=${financeShopFilter}&period=${financePeriod}`, { credentials: "include" }).then((r) => r.json()),
    enabled: isAdmin,
  });
  const { data: crmCustomers, isLoading: loadingCRM } = useQuery<CRMCustomer[]>({
    queryKey: ["/api/admin/crm/customers"],
    enabled: isAdmin,
  });
  const { data: crmProfile, isLoading: loadingCrmProfile } = useQuery<CRMProfile>({
    queryKey: ["/api/admin/crm/customers", crmSelectedCustomer?.id, "profile"],
    queryFn: () => fetch(`/api/admin/crm/customers/${crmSelectedCustomer!.id}`, { credentials: "include" }).then((r) => r.json()),
    enabled: isAdmin && !!crmSelectedCustomer,
  });

  const saveNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest("PATCH", `/api/admin/crm/customers/${id}/notes`, { notes }),
    onSuccess: () => {
      toast({ title: "Заметка сохранена" });
      qc.invalidateQueries({ queryKey: ["/api/admin/crm/customers"] });
    },
    onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
  });

  const crmGrantBonusMutation = useMutation({
    mutationFn: ({ userId, amount, description }: { userId: string; amount: number; description: string }) =>
      apiRequest("POST", "/api/admin/bonuses/grant", { userId, amount, description }),
    onSuccess: () => {
      toast({ title: "Бонусы начислены" });
      if (crmSelectedCustomer) {
        qc.invalidateQueries({ queryKey: ["/api/admin/crm/customers", crmSelectedCustomer.id, "profile"] });
        qc.invalidateQueries({ queryKey: ["/api/admin/crm/customers"] });
      }
    },
    onError: () => toast({ title: "Ошибка начисления", variant: "destructive" }),
  });

  const crmBlockMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/users/${id}/block`, {}),
    onSuccess: () => {
      toast({ title: "Статус пользователя обновлён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/crm/customers"] });
    },
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

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Пользователь удалён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
    onError: (err: any) => {
      let msg = "Ошибка удаления";
      try { msg = JSON.parse(err.message.slice(err.message.indexOf("{"))).error; } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const [bonusGrantUser, setBonusGrantUser] = useState<{ id: string; name: string } | null>(null);
  const [bonusViewUser, setBonusViewUser] = useState<{ id: string; name: string } | null>(null);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDesc, setBonusDesc] = useState("");

  const grantBonusMutation = useMutation({
    mutationFn: ({ userId, amount, description }: { userId: string; amount: number; description: string }) =>
      apiRequest("POST", "/api/admin/bonuses/grant", { userId, amount, description }),
    onSuccess: () => {
      toast({ title: "Бонусы начислены" });
      setBonusGrantUser(null);
      setBonusAmount("");
      setBonusDesc("");
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (bonusViewUser) {
        qc.invalidateQueries({ queryKey: ["/api/admin/users", bonusViewUser.id, "bonuses"] });
      }
    },
    onError: (err: any) => {
      let msg = "Ошибка";
      try { msg = JSON.parse(err.message.slice(err.message.indexOf("{"))).error; } catch {}
      toast({ title: msg, variant: "destructive" });
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
    onError: (err: any) => {
      toast({ title: "Ошибка", description: err?.message || "Не удалось сохранить товар", variant: "destructive" });
    },
  });

  const adminToggleProductMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/products/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/products"] }),
  });

  const toggleShopFeaturedMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) => apiRequest("PATCH", `/api/admin/shops/${id}/featured`, { isFeatured }),
    onSuccess: () => {
      toast({ title: "Статус топа магазина обновлён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/shops"] });
    },
  });

  const toggleProductFeaturedMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) => apiRequest("PATCH", `/api/admin/products/${id}/featured`, { isFeatured }),
    onSuccess: () => {
      toast({ title: "Статус топа товара обновлён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/products"] });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/reviews/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Отзыв удалён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
    },
    onError: () => toast({ title: "Ошибка удаления", variant: "destructive" }),
  });

  const updateReviewStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/reviews/${id}/status`, { status }),
    onSuccess: (_data, vars) => {
      toast({ title: vars.status === "approved" ? "Отзыв одобрен" : "Отзыв отклонён" });
      qc.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
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
  const filteredOrders = (orderFilter === "all" ? orders : orders?.filter((o) => o.status === orderFilter))?.filter((o) => {
    if (!orderSearch.trim()) return true;
    const q = orderSearch.trim().toLowerCase().replace("#", "");
    const num = (o as any).orderNumber?.toString() || "";
    return num === q || o.id.startsWith(q) || o.recipientName?.toLowerCase().includes(q) || (o as any).buyerName?.toLowerCase().includes(q);
  });

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
        <div className="overflow-x-auto -mx-4 px-4 mb-6">
        <TabsList className="h-auto flex-wrap min-w-max gap-1 p-1">
          <TabsTrigger value="shops" className="gap-1 text-xs sm:text-sm" data-testid="tab-shops">
            <Store className="w-4 h-4 shrink-0" />
            <span>Магазины</span>
            {pendingShops.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[10px]">{pendingShops.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1 text-xs sm:text-sm" data-testid="tab-users">
            <Users className="w-4 h-4 shrink-0" />
            <span>Пользователи</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1 text-xs sm:text-sm" data-testid="tab-orders">
            <Package className="w-4 h-4 shrink-0" />
            <span>Заказы</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1 text-xs sm:text-sm" data-testid="tab-products">
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Товары</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1 text-xs sm:text-sm" data-testid="tab-categories">
            <Tag className="w-4 h-4 shrink-0" />
            <span>Категории</span>
          </TabsTrigger>
          <TabsTrigger value="cities" className="gap-1 text-xs sm:text-sm" data-testid="tab-cities">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Города</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="gap-1 text-xs sm:text-sm" data-testid="tab-payouts">
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Выплаты</span>
          </TabsTrigger>
          <TabsTrigger value="finances" className="gap-1 text-xs sm:text-sm" data-testid="tab-finances">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Финансы</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 text-xs sm:text-sm" data-testid="tab-analytics">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Аналитика</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1 text-xs sm:text-sm" data-testid="tab-reviews">
            <Star className="w-4 h-4 shrink-0" />
            <span>Отзывы</span>
            {adminReviews && adminReviews.filter((r: any) => r.status === "pending").length > 0 && (
              <span className="ml-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {adminReviews.filter((r: any) => r.status === "pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-1 text-xs sm:text-sm" data-testid="tab-crm">
            <Users className="w-4 h-4 shrink-0" />
            <span>CRM</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm" data-testid="tab-settings">
            <Settings className="w-4 h-4 shrink-0" />
            <span>Настройки</span>
          </TabsTrigger>
        </TabsList>
        </div>

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
                        <div className="flex flex-wrap gap-2">
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
                          <Button
                            size="sm"
                            variant={(shop as any).isFeatured ? "default" : "outline"}
                            className={`gap-1.5 ${(shop as any).isFeatured ? "bg-amber-500 hover:bg-amber-600 border-amber-500" : ""}`}
                            onClick={() => toggleShopFeaturedMutation.mutate({ id: shop.id, isFeatured: !(shop as any).isFeatured })}
                            disabled={toggleShopFeaturedMutation.isPending}
                            data-testid={`button-featured-shop-${shop.id}`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            {(shop as any).isFeatured ? "Снять с топа" : "В топ"}
                          </Button>
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
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm">{u.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {u.role === "admin" ? "Админ" : u.role === "shop" ? "Продавец" : "Покупатель"}
                          </Badge>
                          {u.isBlocked && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <Ban className="w-3 h-3" /> Заблокирован
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                          <span>{u.email}</span>
                          {u.phone && <span>{u.phone}</span>}
                          {u.createdAt && <span>Рег: {format(new Date(u.createdAt), "d MMM yyyy", { locale: ru })}</span>}
                        </div>
                      </div>
                      {u.role !== "admin" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBonusViewUser({ id: u.id, name: u.name })}
                            className="gap-1.5 text-xs"
                            data-testid={`button-view-bonus-${u.id}`}
                          >
                            <Gift className="w-3.5 h-3.5" /> Бонусы
                          </Button>
                          <Button
                            size="sm"
                            variant={u.isBlocked ? "default" : "destructive"}
                            onClick={() => blockUserMutation.mutate(u.id)}
                            disabled={blockUserMutation.isPending}
                            className="gap-1.5 text-xs"
                            data-testid={`button-block-${u.id}`}
                          >
                            {u.isBlocked ? (
                              <><UserCheck className="w-3.5 h-3.5" /> Разблокировать</>
                            ) : (
                              <><Ban className="w-3.5 h-3.5" /> Заблокировать</>
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => {
                              if (confirm(`Удалить пользователя «${u.name}»? Это действие необратимо.`)) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                            data-testid={`button-delete-user-${u.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ==================== ORDERS ==================== */}
        <TabsContent value="orders">
          <div className="flex flex-wrap items-center gap-3 mb-4">
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
            <Input
              placeholder="Поиск: #номер, получатель…"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-56 h-9"
              data-testid="input-order-search"
            />
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
                        <p className="font-semibold text-sm">#{(order as any).orderNumber || order.id.slice(0, 8).toUpperCase()}</p>
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
                        size="sm"
                        variant={(p as any).isFeatured ? "default" : "ghost"}
                        className={`gap-1 text-xs px-2 ${(p as any).isFeatured ? "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white" : "text-muted-foreground"}`}
                        onClick={() => toggleProductFeaturedMutation.mutate({ id: p.id, isFeatured: !(p as any).isFeatured })}
                        disabled={toggleProductFeaturedMutation.isPending}
                        data-testid={`button-featured-product-${p.id}`}
                        title={(p as any).isFeatured ? "Снять с топа" : "В топ"}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {(p as any).isFeatured ? "Топ" : "В топ"}
                      </Button>
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
                            categoryId: p.categoryId || "__none__",
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
                                <Select value={editProductData.categoryId || "__none__"} onValueChange={(v) => setEditProductData({ ...editProductData, categoryId: v })}>
                                  <SelectTrigger><SelectValue placeholder="Без категории" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Без категории</SelectItem>
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
                                    <SelectItem value="addon">Доп. товар</SelectItem>
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
                              const catId = editProductData.categoryId;
                              const data: Record<string, any> = {
                                name: editProductData.name,
                                description: editProductData.description || null,
                                composition: editProductData.composition || null,
                                type: editProductData.type || "bouquet",
                                price: editProductData.price || "0",
                                discountPercent: editProductData.discountPercent ? parseInt(editProductData.discountPercent) : 0,
                                assemblyTime: editProductData.assemblyTime ? parseInt(editProductData.assemblyTime) : null,
                                inStock: editProductData.inStock === "true",
                                isActive: editProductData.isActive === "true",
                                isRecommended: editProductData.isRecommended === "true",
                                categoryId: (!catId || catId === "__none__") ? null : catId,
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

        {/* ==================== REVIEWS ==================== */}
        <TabsContent value="reviews">
          {loadingReviews ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : adminReviews?.length ? (
            <div className="space-y-3">
              {(() => {
                const pendingReviews = adminReviews.filter((r: any) => r.status === "pending");
                const otherReviews = adminReviews.filter((r: any) => r.status !== "pending");
                const renderReview = (review: any) => (
                  <Card key={review.id} data-testid={`card-review-${review.id}`} className={review.status === "pending" ? "border-amber-400 dark:border-amber-600" : review.status === "rejected" ? "border-destructive/40" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <div className="flex">
                              {[1,2,3,4,5].map((s) => (
                                <Star key={s} className={`w-4 h-4 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                            <span className="text-sm font-semibold">{review.rating} / 5</span>
                            {review.productName ? (
                              <Badge variant="outline" className="text-xs"><MessageSquare className="w-3 h-3 mr-1" />Товар: {review.productName}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs"><Store className="w-3 h-3 mr-1" />Магазин</Badge>
                            )}
                            {review.status === "pending" && (
                              <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white">На модерации</Badge>
                            )}
                            {review.status === "rejected" && (
                              <Badge variant="destructive" className="text-xs">Отклонён</Badge>
                            )}
                          </div>
                          {(review.ratingPrice || review.ratingDelivery || review.ratingService) && (
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-1">
                              {review.ratingPrice && <span>Цена/кач.: <span className="font-medium text-foreground">{review.ratingPrice}</span></span>}
                              {review.ratingDelivery && <span>Доставка: <span className="font-medium text-foreground">{review.ratingDelivery}</span></span>}
                              {review.ratingService && <span>Сервис: <span className="font-medium text-foreground">{review.ratingService}</span></span>}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {review.buyerName && <span>Покупатель: <span className="font-medium">{review.buyerName}</span></span>}
                            {review.shopName && <span>Магазин: <span className="font-medium">{review.shopName}</span></span>}
                            {review.createdAt && <span>{format(new Date(review.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}</span>}
                          </div>
                          {review.comment && (
                            <p className="text-sm mt-1.5 text-muted-foreground italic">«{review.comment}»</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          {review.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2 gap-1"
                                onClick={() => updateReviewStatusMutation.mutate({ id: review.id, status: "approved" })}
                                disabled={updateReviewStatusMutation.isPending}
                                data-testid={`button-approve-review-${review.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />Одобрить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs h-7 px-2 gap-1"
                                onClick={() => updateReviewStatusMutation.mutate({ id: review.id, status: "rejected" })}
                                disabled={updateReviewStatusMutation.isPending}
                                data-testid={`button-reject-review-${review.id}`}
                              >
                                <XCircle className="w-3.5 h-3.5" />Отклонить
                              </Button>
                            </>
                          )}
                          {review.status === "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 gap-1"
                              onClick={() => updateReviewStatusMutation.mutate({ id: review.id, status: "approved" })}
                              disabled={updateReviewStatusMutation.isPending}
                              data-testid={`button-restore-review-${review.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />Одобрить
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7 w-7"
                            onClick={() => {
                              if (confirm("Удалить этот отзыв? Рейтинг будет пересчитан.")) {
                                deleteReviewMutation.mutate(review.id);
                              }
                            }}
                            disabled={deleteReviewMutation.isPending}
                            data-testid={`button-delete-review-${review.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                return (
                  <>
                    {pendingReviews.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />На модерации ({pendingReviews.length})
                        </h3>
                        <div className="space-y-2 mb-4">{pendingReviews.map(renderReview)}</div>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mb-2">Все отзывы: {adminReviews.length} (одобрено: {adminReviews.filter((r: any) => r.status === "approved").length}, отклонено: {adminReviews.filter((r: any) => r.status === "rejected").length})</p>
                    <div className="space-y-2">{otherReviews.map(renderReview)}</div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-10 h-10 mx-auto opacity-20 mb-3" />
              <p>Отзывов пока нет</p>
            </div>
          )}
        </TabsContent>

        {/* ==================== CRM ==================== */}
        <TabsContent value="crm">
          {(() => {
            const crmCities = Array.from(new Set((crmCustomers || []).map((c) => c.cityName).filter(Boolean))) as string[];
            const filteredCRM = (crmCustomers || []).filter((c) => {
              const q = crmSearch.toLowerCase();
              const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
              const matchSeg = crmSegmentFilter === "all" || c.segment === crmSegmentFilter;
              const matchCity = crmCityFilter === "all" || c.cityName === crmCityFilter;
              return matchSearch && matchSeg && matchCity;
            });
            return (
              <>
                <div className="flex flex-wrap gap-3 mb-4 items-center">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Поиск по имени или email..."
                      value={crmSearch}
                      onChange={(e) => setCrmSearch(e.target.value)}
                      data-testid="input-crm-search"
                    />
                  </div>
                  <Select value={crmSegmentFilter} onValueChange={setCrmSegmentFilter}>
                    <SelectTrigger className="w-40" data-testid="select-crm-segment">
                      <SelectValue placeholder="Все сегменты" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все сегменты</SelectItem>
                      <SelectItem value="new">Новые</SelectItem>
                      <SelectItem value="active">Активные</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="churned">Отток</SelectItem>
                    </SelectContent>
                  </Select>
                  {crmCities.length > 0 && (
                    <Select value={crmCityFilter} onValueChange={setCrmCityFilter}>
                      <SelectTrigger className="w-44" data-testid="select-crm-city">
                        <SelectValue placeholder="Все города" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все города</SelectItem>
                        {crmCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <span className="text-sm text-muted-foreground">{filteredCRM.length} покупателей</span>
                </div>
                {loadingCRM ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Покупатель</th>
                            <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Сегмент</th>
                            <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Телефон</th>
                            <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Заказов</th>
                            <th className="text-right px-4 py-2 font-medium">LTV</th>
                            <th className="text-right px-4 py-2 font-medium hidden lg:table-cell">Бонусы</th>
                            <th className="text-right px-4 py-2 font-medium hidden xl:table-cell">Посл. заказ</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCRM.map((c) => (
                            <tr
                              key={c.id}
                              className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => {
                                setCrmSelectedCustomer(c);
                                setCrmNotes(c.adminNotes || "");
                                setCrmGrantOpen(false);
                                setCrmGrantAmount("");
                                setCrmGrantDesc("");
                              }}
                              data-testid={`row-crm-customer-${c.id}`}
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium">{c.name}</div>
                                <div className="text-xs text-muted-foreground">{c.email}</div>
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CRM_SEGMENT_COLORS[c.segment]}`}>
                                  {CRM_SEGMENT_LABELS[c.segment]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{c.phone || "—"}</td>
                              <td className="px-4 py-3 text-right hidden md:table-cell">{c.orderCount}</td>
                              <td className="px-4 py-3 text-right font-medium">{c.ltv.toLocaleString("ru")} ₽</td>
                              <td className="px-4 py-3 text-right hidden lg:table-cell">{c.bonusBalance}</td>
                              <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden xl:table-cell">
                                {c.lastOrderAt ? format(new Date(c.lastOrderAt), "d MMM yyyy", { locale: ru }) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                              </td>
                            </tr>
                          ))}
                          {filteredCRM.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Покупателей нет</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Customer Profile Sheet */}
          <Sheet open={!!crmSelectedCustomer} onOpenChange={(open) => { if (!open) { setCrmSelectedCustomer(null); setCrmGrantOpen(false); } }}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              {crmSelectedCustomer && (
                <>
                  <SheetHeader className="mb-4">
                    <SheetTitle data-testid="text-crm-customer-name">{crmSelectedCustomer.name}</SheetTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{crmSelectedCustomer.email}</span>
                      {crmSelectedCustomer.phone && <span>· {crmSelectedCustomer.phone}</span>}
                      {crmSelectedCustomer.cityName && <span>· {crmSelectedCustomer.cityName}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CRM_SEGMENT_COLORS[crmSelectedCustomer.segment]}`}>
                        {CRM_SEGMENT_LABELS[crmSelectedCustomer.segment]}
                      </span>
                      {crmSelectedCustomer.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          С {format(new Date(crmSelectedCustomer.createdAt), "d MMM yyyy", { locale: ru })}
                        </span>
                      )}
                    </div>
                  </SheetHeader>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Заказов", value: crmSelectedCustomer.orderCount },
                      { label: "LTV", value: `${crmSelectedCustomer.ltv.toLocaleString("ru")} ₽` },
                      { label: "Бонусов", value: loadingCrmProfile ? "..." : (crmProfile?.bonusBalance ?? crmSelectedCustomer.bonusBalance) },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border p-3 text-center">
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                        <div className="font-bold text-sm mt-0.5" data-testid={`text-crm-stat-${s.label}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 flex-1"
                      onClick={() => setCrmGrantOpen((o) => !o)}
                      data-testid="button-crm-grant-bonus"
                    >
                      <Gift className="w-3.5 h-3.5" /> Начислить бонусы
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        const u = users?.find((u) => u.id === crmSelectedCustomer.id);
                        crmBlockMutation.mutate(crmSelectedCustomer.id);
                        if (u) toast({ title: u.isBlocked ? "Пользователь разблокирован" : "Пользователь заблокирован" });
                      }}
                      disabled={crmBlockMutation.isPending}
                      data-testid="button-crm-block"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {users?.find((u) => u.id === crmSelectedCustomer.id)?.isBlocked ? "Разблокировать" : "Заблокировать"}
                    </Button>
                  </div>

                  {/* Grant bonus inline form */}
                  {crmGrantOpen && (
                    <div className="border rounded-lg p-3 mb-4 space-y-2 bg-muted/30">
                      <p className="text-xs font-medium">Начислить бонусы покупателю</p>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          placeholder="Сумма"
                          value={crmGrantAmount}
                          onChange={(e) => setCrmGrantAmount(e.target.value)}
                          className="w-24"
                          data-testid="input-crm-grant-amount"
                        />
                        <Input
                          placeholder="Причина"
                          value={crmGrantDesc}
                          onChange={(e) => setCrmGrantDesc(e.target.value)}
                          className="flex-1"
                          data-testid="input-crm-grant-desc"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!crmGrantAmount || Number(crmGrantAmount) <= 0 || crmGrantBonusMutation.isPending}
                          onClick={() => {
                            crmGrantBonusMutation.mutate({
                              userId: crmSelectedCustomer.id,
                              amount: Number(crmGrantAmount),
                              description: crmGrantDesc || "Начисление администратором",
                            });
                            setCrmGrantAmount("");
                            setCrmGrantDesc("");
                            setCrmGrantOpen(false);
                          }}
                          data-testid="button-crm-grant-confirm"
                        >
                          {crmGrantBonusMutation.isPending ? "Начисляем..." : "Начислить"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCrmGrantOpen(false)}>Отмена</Button>
                      </div>
                    </div>
                  )}

                  <Separator className="mb-4" />

                  {/* Admin notes (autosave on blur) */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <StickyNote className="w-4 h-4" /> Заметки
                      </h4>
                      {saveNotesMutation.isPending && (
                        <span className="text-xs text-muted-foreground">Сохранение...</span>
                      )}
                    </div>
                    <Textarea
                      value={crmNotes}
                      onChange={(e) => setCrmNotes(e.target.value)}
                      onBlur={() => {
                        if (crmNotes !== (crmSelectedCustomer.adminNotes || "")) {
                          saveNotesMutation.mutate({ id: crmSelectedCustomer.id, notes: crmNotes });
                        }
                      }}
                      rows={3}
                      placeholder="Напишите заметку об этом покупателе..."
                      data-testid="textarea-crm-notes"
                    />
                  </div>

                  <Separator className="mb-4" />

                  {/* Orders */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4" /> История заказов
                    </h4>
                    {loadingCrmProfile ? (
                      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
                    ) : !crmProfile?.orders?.length ? (
                      <p className="text-sm text-muted-foreground">Заказов нет</p>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {crmProfile.orders.map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between text-xs border rounded p-2.5" data-testid={`crm-order-${o.id}`}>
                            <div>
                              <span className="font-medium">#{o.orderNumber || o.id.slice(-6)}</span>
                              {o.shopName && <span className="ml-2 text-muted-foreground">{o.shopName}</span>}
                              {o.createdAt && (
                                <span className="ml-2 text-muted-foreground">
                                  {format(new Date(o.createdAt), "d MMM yyyy", { locale: ru })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(o.status)}`}>
                                {getStatusLabel(o.status)}
                              </span>
                              <span className="font-semibold">{parseFloat(o.totalAmount).toLocaleString("ru")} ₽</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator className="mb-4" />

                  {/* Bonus history */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Gift className="w-4 h-4" /> История бонусов
                    </h4>
                    {loadingCrmProfile ? (
                      <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
                    ) : !crmProfile?.bonusTransactions?.length ? (
                      <p className="text-sm text-muted-foreground">Операций нет</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {crmProfile.bonusTransactions.map((t: any) => (
                          <div key={t.id} className="flex justify-between items-center text-xs border rounded p-2" data-testid={`crm-bonus-txn-${t.id}`}>
                            <div>
                              <span className="font-medium">{t.description || BONUS_REASON_LABELS[t.reason] || t.reason}</span>
                              {t.createdAt && (
                                <span className="ml-2 text-muted-foreground">
                                  {format(new Date(t.createdAt), "d MMM yyyy", { locale: ru })}
                                </span>
                              )}
                            </div>
                            <Badge variant={t.amount > 0 ? "default" : "destructive"} className="shrink-0 ml-2 text-xs">
                              {t.amount > 0 ? "+" : ""}{t.amount}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator className="mb-4" />

                  {/* Reviews */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Star className="w-4 h-4" /> Отзывы
                    </h4>
                    {loadingCrmProfile ? (
                      <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
                    ) : !crmProfile?.reviews?.length ? (
                      <p className="text-sm text-muted-foreground">Отзывов нет</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {crmProfile.reviews.map((r: any) => (
                          <div key={r.id} className="flex gap-2 text-xs border rounded p-2.5" data-testid={`crm-review-${r.id}`}>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                              ))}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{r.comment || "Без комментария"}</p>
                            </div>
                            <span className="text-muted-foreground shrink-0">
                              {r.createdAt ? format(new Date(r.createdAt), "d MMM yyyy", { locale: ru }) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
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
              <Button
                onClick={() => updateSettingsMutation.mutate()}
                disabled={!commission || updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                Сохранить настройки
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!bonusViewUser} onOpenChange={(open) => { if (!open) { setBonusViewUser(null); setBonusGrantUser(null); setBonusAmount(""); setBonusDesc(""); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Бонусы — {bonusViewUser?.name}</DialogTitle>
          </DialogHeader>
          {bonusViewUser && <AdminBonusCard userId={bonusViewUser.id} />}
          <Separator />
          {!bonusGrantUser ? (
            <Button variant="outline" onClick={() => setBonusGrantUser(bonusViewUser)} className="w-full gap-2" data-testid="button-open-grant-form">
              <Gift className="w-4 h-4" /> Начислить бонусы
            </Button>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Начислить бонусы</h4>
              <div>
                <Label>Сумма</Label>
                <Input type="number" min={1} value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} placeholder="100" data-testid="input-bonus-grant-amount" />
              </div>
              <div>
                <Label>Описание</Label>
                <Input value={bonusDesc} onChange={(e) => setBonusDesc(e.target.value)} placeholder="Причина начисления" data-testid="input-bonus-grant-desc" />
              </div>
              <Button
                onClick={() => {
                  if (bonusGrantUser && Number(bonusAmount) > 0) {
                    grantBonusMutation.mutate({ userId: bonusGrantUser.id, amount: Number(bonusAmount), description: bonusDesc });
                  }
                }}
                disabled={!bonusAmount || Number(bonusAmount) <= 0 || grantBonusMutation.isPending}
                className="w-full"
                data-testid="button-confirm-bonus-grant"
              >
                {grantBonusMutation.isPending ? "Начисляем..." : "Начислить"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
