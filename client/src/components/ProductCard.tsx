import { Link } from "wouter";
import { ShoppingCart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StarRating } from "./StarRating";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product & { shopName?: string; categoryName?: string };
  shopId?: string;
  className?: string;
}

export function ProductCard({ product, shopId, className }: ProductCardProps) {
  const { addItem, items, triggerAddonSuggestion } = useCart();
  const { toast } = useToast();
  const inCart = items.some((i) => i.product.id === product.id);

  const discountPercent = (product as any).discountPercent || 0;
  const originalPrice = Number(product.price);
  const discountedPrice = discountPercent > 0
    ? Math.round(originalPrice * (1 - discountPercent / 100))
    : originalPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sid = shopId || product.shopId;
    const success = addItem(product, sid);
    if (!success) {
      toast({
        title: "Корзина содержит товары из другого магазина",
        description: "Очистите корзину, чтобы добавить товар из этого магазина",
        variant: "destructive",
      });
    } else {
      toast({ title: "Добавлено в корзину", description: product.name });
      if ((product as any).type !== "addon") {
        triggerAddonSuggestion(sid);
      }
    }
  };

  const image = product.images?.[0] || "/images/placeholder-bouquet.png";

  return (
    <Link href={`/product/${product.id}`}>
      <Card className={cn("group cursor-pointer hover-elevate transition-all duration-200 overflow-hidden", className)}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Badge variant="secondary">Нет в наличии</Badge>
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {discountPercent > 0 && (
              <Badge className="bg-red-500 hover:bg-red-500 text-white" data-testid={`badge-discount-${product.id}`}>
                -{discountPercent}%
              </Badge>
            )}
            {(product as any).isRecommended && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white" data-testid={`badge-recommended-${product.id}`}>
                ★ Выбор магазина
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            {(product as any).type === "gift" && (
              <Badge variant="default" data-testid={`badge-type-${product.id}`}>Подарок</Badge>
            )}
            {(product as any).type === "tasty_gift" && (
              <Badge variant="default" data-testid={`badge-type-${product.id}`}>Вкусный подарок</Badge>
            )}
            {(product as any).type === "addon" && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white" data-testid={`badge-type-${product.id}`}>Доп. товар</Badge>
            )}
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div>
            <p className="font-semibold text-sm line-clamp-1">{product.name}</p>
            {product.shopName && (
              <p className="text-xs text-muted-foreground line-clamp-1">{product.shopName}</p>
            )}
          </div>
          <StarRating rating={Number(product.rating)} showValue count={product.reviewCount || 0} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{product.assemblyTime} мин</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">{discountedPrice.toLocaleString("ru-RU")} ₽</span>
              {discountPercent > 0 && (
                <span className="text-xs text-muted-foreground line-through leading-tight">
                  {originalPrice.toLocaleString("ru-RU")} ₽
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              onClick={handleAddToCart}
              disabled={!product.inStock || !product.isActive}
              data-testid={`button-add-to-cart-${product.id}`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}
