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
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const inCart = items.some((i) => i.product.id === product.id);

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
          {product.categoryName && (
            <Badge className="absolute top-2 left-2" variant="secondary">
              {product.categoryName}
            </Badge>
          )}
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
            <span className="font-bold text-lg">{Number(product.price).toLocaleString("ru-RU")} ₽</span>
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
