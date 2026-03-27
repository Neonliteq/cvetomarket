import { Link, useLocation } from "wouter";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import type { Shop } from "@shared/schema";

export default function Cart() {
  const { items, shopId, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: shop } = useQuery<Shop>({
    queryKey: ["/api/shops", shopId],
    enabled: !!shopId,
  });
  const DELIVERY = shop ? Number(shop.deliveryPrice) || 0 : 300;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
        <h2 className="text-xl font-bold">Корзина пуста</h2>
        <p className="text-muted-foreground text-sm">Добавьте букеты из каталога, чтобы оформить заказ</p>
        <Link href="/catalog">
          <Button data-testid="button-go-catalog">Перейти в каталог</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Корзина</h1>
          <p className="text-muted-foreground text-sm">{itemCount} позиций</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive gap-1.5" data-testid="button-clear-cart">
          <Trash2 className="w-4 h-4" /> Очистить
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const image = item.product.images?.[0] || "/images/placeholder-bouquet.png";
            return (
              <Card key={item.product.id}>
                <CardContent className="p-4 flex gap-4">
                  <div className="w-20 h-20 rounded-md overflow-hidden shrink-0 bg-muted">
                    <img src={image} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{item.product.name}</p>
                        {item.product.shopName && (
                          <p className="text-xs text-muted-foreground">{item.product.shopName}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-muted-foreground shrink-0"
                        data-testid={`button-remove-${item.product.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          data-testid={`button-qty-minus-${item.product.id}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium" data-testid={`text-qty-${item.product.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          data-testid={`button-qty-plus-${item.product.id}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <span className="font-bold">
                        {(Number(item.product.price) * item.quantity).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <Card className="sticky top-20">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold">Итого</h3>
              <div className="space-y-2 text-sm">
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
                <span>Всего</span>
                <span className="text-primary">{(total + DELIVERY).toLocaleString("ru-RU")} ₽</span>
              </div>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => navigate("/checkout")}
                data-testid="button-checkout"
              >
                Оформить заказ
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Link href="/catalog">
                <Button variant="ghost" className="w-full" size="sm">Продолжить покупки</Button>
              </Link>
              <Link href="/delivery-and-payment">
                <p className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-delivery-info-cart">
                  Условия доставки и оплаты
                </p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
