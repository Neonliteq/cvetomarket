import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Users, Store, Package, Settings, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Shop, User, Category, City, Order, PlatformSettings } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [commission, setCommission] = useState("");

  const { data: shops, isLoading: loadingShops } = useQuery<(Shop & { cityName?: string; ownerName?: string })[]>({
    queryKey: ["/api/admin/shops"],
    enabled: !!user && user.role === "admin",
  });
  const { data: users, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === "admin",
  });
  const { data: orders, isLoading: loadingOrders } = useQuery<(Order & { buyerName?: string; shopName?: string })[]>({
    queryKey: ["/api/admin/orders"],
    enabled: !!user && user.role === "admin",
  });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: cities } = useQuery<City[]>({ queryKey: ["/api/cities"] });
  const { data: settings } = useQuery<PlatformSettings>({ queryKey: ["/api/admin/settings"] });

  const moderateShopMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/admin/shops/${id}/status`, { status }),
    onSuccess: () => { toast({ title: "Статус магазина обновлён" }); qc.invalidateQueries({ queryKey: ["/api/admin/shops"] }); },
  });

  const blockUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/users/${id}/block`, {}),
    onSuccess: () => { toast({ title: "Пользователь заблокирован" }); qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); },
  });

  const addCategoryMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/categories", { name: newCategoryName, slug: newCategorySlug }),
    onSuccess: () => { setNewCategoryName(""); setNewCategorySlug(""); qc.invalidateQueries({ queryKey: ["/api/categories"] }); toast({ title: "Категория добавлена" }); },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/categories/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/categories"] }),
  });

  const addCityMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/cities", { name: newCityName }),
    onSuccess: () => { setNewCityName(""); qc.invalidateQueries({ queryKey: ["/api/cities"] }); toast({ title: "Город добавлен" }); },
  });

  const deleteCityMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cities/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/cities"] }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/admin/settings", { commissionRate: commission }),
    onSuccess: () => { toast({ title: "Настройки сохранены" }); qc.invalidateQueries({ queryKey: ["/api/admin/settings"] }); },
  });

  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const pendingShops = (shops || []).filter((s) => s.status === "pending");
  const totalRevenue = (orders || []).filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.totalAmount), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Панель администратора</h1>
        <p className="text-muted-foreground text-sm mt-1">Управление платформой ЦветоМаркет</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Магазины", value: shops?.length || 0, sub: `${pendingShops.length} на модерации`, icon: Store },
          { title: "Пользователи", value: users?.length || 0, icon: Users },
          { title: "Заказы", value: orders?.length || 0, icon: Package },
          { title: "Оборот", value: `${totalRevenue.toLocaleString("ru")} ₽`, icon: Settings },
        ].map((s) => (
          <Card key={s.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.title}</p>
                <p className="text-lg font-bold">{s.value}</p>
                {s.sub && <p className="text-xs text-amber-500">{s.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="shops">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="shops">
            Магазины {pendingShops.length > 0 && <Badge className="ml-1.5">{pendingShops.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="cities">Города</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="shops">
          {loadingShops ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-3">
              {shops?.map((shop) => (
                <Card key={shop.id} data-testid={`card-shop-${shop.id}`}>
                  <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{shop.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {shop.cityName && <span className="text-xs text-muted-foreground">{shop.cityName}</span>}
                        {shop.ownerName && <span className="text-xs text-muted-foreground">Владелец: {shop.ownerName}</span>}
                      </div>
                    </div>
                    <Badge variant={shop.status === "approved" ? "default" : shop.status === "pending" ? "secondary" : "destructive"}>
                      {shop.status === "approved" ? "Одобрен" : shop.status === "pending" ? "На модерации" : "Отклонён"}
                    </Badge>
                    <div className="flex gap-2">
                      {shop.status !== "approved" && (
                        <Button size="sm" onClick={() => moderateShopMutation.mutate({ id: shop.id, status: "approved" })} className="gap-1.5" data-testid={`button-approve-${shop.id}`}>
                          <CheckCircle className="w-3.5 h-3.5" /> Одобрить
                        </Button>
                      )}
                      {shop.status !== "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => moderateShopMutation.mutate({ id: shop.id, status: "rejected" })} className="gap-1.5 text-destructive" data-testid={`button-reject-${shop.id}`}>
                          <XCircle className="w-3.5 h-3.5" /> Отклонить
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          {loadingUsers ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-2">
              {users?.map((u) => (
                <Card key={u.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="outline">{u.role}</Badge>
                    {u.role !== "admin" && (
                      <Button size="sm" variant="destructive" onClick={() => blockUserMutation.mutate(u.id)} data-testid={`button-block-${u.id}`}>
                        Заблокировать
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {loadingOrders ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-3">
              {orders?.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        {order.buyerName && <span>Покупатель: {order.buyerName}</span>}
                        {order.shopName && <span>Магазин: {order.shopName}</span>}
                        {order.createdAt && <span>{format(new Date(order.createdAt), "d MMM HH:mm", { locale: ru })}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</p>
                      <Badge variant="secondary">{order.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input placeholder="Название категории" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} data-testid="input-category-name" />
              <Input placeholder="slug (birthday)" value={newCategorySlug} onChange={(e) => setNewCategorySlug(e.target.value)} data-testid="input-category-slug" />
              <Button onClick={() => addCategoryMutation.mutate()} disabled={!newCategoryName || !newCategorySlug} data-testid="button-add-category">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {categories?.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center gap-3">
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cities">
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input placeholder="Название города" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} data-testid="input-city-name" />
              <Button onClick={() => addCityMutation.mutate()} disabled={!newCityName} data-testid="button-add-city">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {cities?.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <p className="flex-1 font-medium text-sm">{c.name}</p>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCityMutation.mutate(c.id)} data-testid={`button-delete-city-${c.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold">Настройки платформы</h3>
              <div className="space-y-2">
                <Label>Комиссия платформы (%)</Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder={settings?.commissionRate?.toString() || "10"}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="max-w-32"
                    data-testid="input-commission"
                  />
                  <Button onClick={() => updateSettingsMutation.mutate()} disabled={!commission} data-testid="button-save-settings">
                    Сохранить
                  </Button>
                </div>
                {settings && (
                  <p className="text-xs text-muted-foreground">Текущая комиссия: {settings.commissionRate}%</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
