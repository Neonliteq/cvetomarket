import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

  const DELIVERY = 300;

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
      });
    },
    onSuccess: (data) => {
      setOrderId(data.order?.id);
      setSuccess(true);
      clearCart();
    },
    onError: () => {
      toast({ title: "Ошибка оформления заказа", description: "Попробуйте ещё раз", variant: "destructive" });
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
                      <FormControl><Input {...field} placeholder="Ул. Цветочная, д. 1, кв. 10" data-testid="input-address" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                  <p className="text-xs text-muted-foreground">Тестовый режим оплаты. Реальные деньги не списываются.</p>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending} data-testid="button-place-order">
                {mutation.isPending ? "Оформляем..." : `Оформить заказ на ${(total + DELIVERY).toLocaleString("ru-RU")} ₽`}
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
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Итого</span>
                <span className="text-primary">{(total + DELIVERY).toLocaleString("ru-RU")} ₽</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
