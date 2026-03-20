import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Gift } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckoutMap } from "@/components/CheckoutMap";
import type { Shop } from "@shared/schema";

const checkoutSchema = z.object({
  deliveryAddress: z.string().min(5, "Введите адрес доставки"),
  deliveryDate: z.string().min(1, "Выберите дату доставки"),
  deliveryTime: z.string().min(1, "Выберите время доставки"),
  recipientName: z.string().min(2, "Введите имя получателя"),
  recipientPhone: z.string().min(7, "Введите телефон получателя"),
  comment: z.string().optional(),
  paymentMethod: z.enum(["card", "cash"]),
});

const TIME_SLOTS = ["09:00–12:00", "12:00–15:00", "15:00–18:00", "18:00–21:00"];

export default function Checkout() {
  const [, navigate] = useLocation();
  const { items, shopId, total, clearCart } = useCart();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const { data: shop } = useQuery<Shop>({
    queryKey: ["/api/shops", shopId],
    enabled: !!shopId,
  });
  const defaultDelivery = shop ? Number(shop.deliveryPrice) || 0 : 300;
  const [deliveryCost, setDeliveryCost] = useState<number | null>(null);
  const [deliveryZoneName, setDeliveryZoneName] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [outsideZone, setOutsideZone] = useState(false);
  const [addressChecked, setAddressChecked] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [bonusToUse, setBonusToUse] = useState(0);
  const shopHasZones = !!(shop as any)?.deliveryZones?.length;
  const DELIVERY = deliveryCost !== null ? deliveryCost : defaultDelivery;

  const { data: bonusData } = useQuery<{ balance: number }>({
    queryKey: ["/api/bonuses"],
    enabled: !!user,
  });
  const bonusBalance = bonusData?.balance || 0;
  const maxBonus = Math.min(bonusBalance, Math.floor(total + DELIVERY));

  useEffect(() => {
    if (bonusToUse > maxBonus) setBonusToUse(maxBonus);
  }, [maxBonus, bonusToUse]);

  const finalTotal = total + DELIVERY - bonusToUse;

  const fetchDeliveryCost = useCallback(async (lat: number, lng: number) => {
    if (!shopId) return;
    setGeocoding(true);
    try {
      const costRes = await fetch(`/api/shops/${shopId}/delivery-cost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lat, lng }),
      });
      const costData = await costRes.json();
      setDeliveryCost(Number(costData.price));
      setDeliveryZoneName(costData.zone || null);
      setDeliveryCoords({ lat, lng });
      setAddressChecked(true);
      if (costData.hasZones && !costData.zone) {
        setOutsideZone(true);
      } else {
        setOutsideZone(false);
      }
    } catch {
      setDeliveryCost(null);
      setDeliveryZoneName(null);
      setDeliveryCoords(null);
      setOutsideZone(false);
      setAddressChecked(false);
    } finally {
      setGeocoding(false);
    }
  }, [shopId]);

  const geocodeAddress = useCallback(async (address: string) => {
    if (!address || address.length < 5 || !shopId) return;
    setGeocoding(true);
    try {
      const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
      if (!apiKey) { setDeliveryCost(null); setDeliveryZoneName(null); return; }
      const geoRes = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&format=json`);
      const geoData = await geoRes.json();
      const pos = geoData?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      if (!pos) { setDeliveryCost(null); setDeliveryZoneName(null); setGeocoding(false); return; }
      const [lng, lat] = pos.split(" ").map(Number);
      await fetchDeliveryCost(lat, lng);
    } catch {
      setDeliveryCost(null);
      setDeliveryZoneName(null);
      setGeocoding(false);
    }
  }, [shopId, fetchDeliveryCost]);

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryAddress: "",
      deliveryDate: "",
      deliveryTime: "",
      recipientName: user?.name || "",
      recipientPhone: user?.phone || "",
      comment: "",
      paymentMethod: "card",
    },
  });

  const handleMapAddressSelect = useCallback((address: string, lat: number, lng: number) => {
    form.setValue("deliveryAddress", address, { shouldValidate: true });
    fetchDeliveryCost(lat, lng);
  }, [form, fetchDeliveryCost]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof checkoutSchema>) => {
      return await apiRequest("POST", "/api/orders", {
        ...data,
        shopId,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          productImage: i.product.images?.[0] || null,
          quantity: i.quantity,
          price: i.product.price,
        })),
        totalAmount: total + DELIVERY,
        deliveryCost: DELIVERY,
        bonusUsed: bonusToUse,
        deliveryLat: deliveryCoords?.lat ?? null,
        deliveryLng: deliveryCoords?.lng ?? null,
      });
    },
    onSuccess: (data) => {
      clearCart();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      setOrderId(data.order?.id);
      setSuccess(true);
    },
    onError: (error: any) => {
      let msg = "Попробуйте ещё раз";
      try {
        const raw = error?.message || "";
        const jsonPart = raw.includes("{") ? raw.slice(raw.indexOf("{")) : "";
        if (jsonPart) {
          const parsed = JSON.parse(jsonPart);
          msg = parsed.error || msg;
        }
      } catch {}
      toast({ title: "Ошибка оформления заказа", description: msg, variant: "destructive" });
    },
  });

  if (isLoading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  if (items.length === 0 && !success) {
    navigate("/cart");
    return null;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Заказ оформлен!</h2>
        <p className="text-muted-foreground text-sm">
          Ваш заказ принят и передан в магазин. Следите за статусом в личном кабинете.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate("/account")} data-testid="button-my-orders">Мои заказы</Button>
          <Button variant="outline" onClick={() => navigate("/catalog")}>Продолжить покупки</Button>
        </div>
      </div>
    );
  }

  const onSubmit = (data: z.infer<typeof checkoutSchema>) => mutation.mutate(data);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Оформление заказа</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <h3 className="font-semibold">Получатель</h3>
                  <FormField control={form.control} name="recipientName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя получателя</FormLabel>
                      <FormControl><Input {...field} placeholder="Иван Иванов" data-testid="input-recipient-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="recipientPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон получателя</FormLabel>
                      <FormControl><Input {...field} placeholder="+7 (999) 000-00-00" data-testid="input-recipient-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-4">
                  <h3 className="font-semibold">Доставка</h3>
                  <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Адрес доставки</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ул. Цветочная, д. 1, кв. 10"
                          data-testid="input-address"
                          onBlur={(e) => {
                            field.onBlur();
                            geocodeAddress(e.target.value);
                          }}
                        />
                      </FormControl>
                      {geocoding && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 animate-pulse" /> Определяем зону доставки...
                        </p>
                      )}
                      {deliveryZoneName && !geocoding && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs" data-testid="badge-delivery-zone">
                            <MapPin className="w-3 h-3 mr-1" />
                            {deliveryZoneName}: {DELIVERY.toLocaleString("ru-RU")} ₽
                          </Badge>
                        </div>
                      )}
                      {outsideZone && !geocoding && addressChecked && (
                        <p className="text-xs text-destructive font-medium mt-1" data-testid="text-outside-zone">
                          Этот адрес находится за пределами зон доставки магазина. Выберите адрес в зоне доставки.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                  {shopId && (
                    <CheckoutMap
                      shopId={shopId}
                      onAddressSelect={handleMapAddressSelect}
                      initialAddress={form.getValues("deliveryAddress")}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата</FormLabel>
                        <FormControl><Input {...field} type="date" min={new Date().toISOString().split("T")[0]} data-testid="input-date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="deliveryTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Время</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-time">
                              <SelectValue placeholder="Выберите..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="comment" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Комментарий к заказу</FormLabel>
                      <FormControl><Textarea {...field} placeholder="Пожелания, особенности доставки..." data-testid="input-comment" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-3">
                  <h3 className="font-semibold">Оплата</h3>
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="card">Картой онлайн</SelectItem>
                          <SelectItem value="cash">Наличными при получении</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <p className="text-xs text-muted-foreground">Оплата через защищённый платёжный сервис ROBOKASSA.</p>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending || outsideZone || geocoding || (shopHasZones && !addressChecked)} data-testid="button-place-order">
                {mutation.isPending ? "Оформляем..." : outsideZone ? "Адрес за пределами зоны доставки" : (shopHasZones && !addressChecked) ? "Укажите адрес в зоне доставки" : `Оформить заказ на ${finalTotal.toLocaleString("ru-RU")} ₽`}
              </Button>
            </form>
          </Form>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold">Ваш заказ</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 text-sm">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                      <img
                        src={item.product.images?.[0] || "/images/placeholder-bouquet.png"}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">{item.product.name}</p>
                      <p className="text-muted-foreground text-xs">× {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium shrink-0">
                      {(Number(item.product.price) * item.quantity).toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Товары</span>
                  <span>{total.toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Доставка</span>
                  <span>{DELIVERY.toLocaleString("ru-RU")} ₽</span>
                </div>
              </div>
              {bonusBalance > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span className="font-medium">Списать бонусы</span>
                      <span className="text-xs text-muted-foreground">(доступно {bonusBalance})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={maxBonus}
                        value={bonusToUse || ""}
                        onChange={(e) => {
                          const v = Math.min(Math.max(0, parseInt(e.target.value) || 0), maxBonus);
                          setBonusToUse(v);
                        }}
                        className="w-24 h-8 text-sm"
                        placeholder="0"
                        data-testid="input-bonus-use"
                      />
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBonusToUse(maxBonus)} data-testid="button-use-all-bonuses">
                        Все
                      </Button>
                    </div>
                    {bonusToUse > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>Скидка бонусами</span>
                        <span>-{bonusToUse.toLocaleString("ru-RU")} ₽</span>
                      </div>
                    )}
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Итого</span>
                <span className="text-primary">{finalTotal.toLocaleString("ru-RU")} ₽</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
