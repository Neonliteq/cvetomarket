import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, ArrowLeft, Clock, Store, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { StarRating, InteractiveStarRating } from "@/components/StarRating";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product, Shop, Review } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type ProductWithMeta = Product & { shopName?: string; categoryName?: string };
type ReviewWithUser = Review & { buyerName?: string };

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedImg, setSelectedImg] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: product, isLoading } = useQuery<ProductWithMeta>({ queryKey: [`/api/products/${id}`] });
  const { data: reviews } = useQuery<ReviewWithUser[]>({ queryKey: [`/api/products/${id}/reviews`] });
  const { data: shop } = useQuery<Shop & { cityName?: string }>({
    queryKey: [`/api/shops/${product?.shopId}`],
    enabled: !!product?.shopId,
  });

  const handleAddToCart = () => {
    if (!product) return;
    const success = addItem(product, product.shopId);
    if (!success) {
      toast({ title: "Товар из другого магазина", description: "Сначала очистите корзину", variant: "destructive" });
    } else {
      toast({ title: "Добавлено в корзину", description: product.name });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="text-center py-20">Товар не найден</div>;

  const images = product.images?.length ? product.images : ["/images/placeholder-bouquet.jpg"];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/catalog">
        <Button variant="ghost" size="sm" className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Назад в каталог
        </Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="space-y-3">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={images[selectedImg]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`w-16 h-16 rounded-md overflow-hidden shrink-0 ring-2 transition-all ${i === selectedImg ? "ring-primary" : "ring-transparent"}`}
                  data-testid={`button-img-${i}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            {product.categoryName && <Badge variant="secondary" className="mb-2">{product.categoryName}</Badge>}
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <div className="mt-2">
              <StarRating rating={Number(product.rating)} size="md" showValue count={product.reviewCount || 0} />
            </div>
          </div>

          <div className="text-3xl font-bold text-primary">
            {Number(product.price).toLocaleString("ru-RU")} ₽
          </div>

          {product.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Время сборки: {product.assemblyTime} мин</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={product.inStock ? "default" : "destructive"}>
              {product.inStock ? "В наличии" : "Нет в наличии"}
            </Badge>
          </div>

          {shop && (
            <Link href={`/shop/${shop.id}`}>
              <div className="flex items-center gap-3 p-3 rounded-md border border-border hover-elevate cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{shop.name}</p>
                  {shop.cityName && <p className="text-xs text-muted-foreground">{shop.cityName}</p>}
                </div>
              </div>
            </Link>
          )}

          <Button
            size="lg"
            className="w-full gap-2"
            disabled={!product.inStock || !product.isActive}
            onClick={handleAddToCart}
            data-testid="button-add-to-cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {product.inStock ? "Добавить в корзину" : "Нет в наличии"}
          </Button>

          {user && shop && (
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/shops/${shop.id}/owner`, { credentials: "include" });
                  const data = await res.json();
                  if (data.ownerId) {
                    await apiRequest("POST", "/api/messages", {
                      receiverId: data.ownerId,
                      content: `Здравствуйте! Вопрос по товару «${product.name}»`,
                    });
                    navigate(`/chat?userId=${data.ownerId}`);
                  }
                } catch {
                  navigate("/chat");
                }
              }}
              data-testid="button-chat-seller"
            >
              <MessageCircle className="w-5 h-5" />
              Написать продавцу
            </Button>
          )}
        </div>
      </div>

      <Separator className="mb-10" />

      <div>
        <h2 className="text-xl font-bold mb-6">Отзывы {reviews?.length ? `(${reviews.length})` : ""}</h2>
        {reviews?.length ? (
          <div className="space-y-4 mb-8">
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback>{(r.buyerName || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{r.buyerName || "Аноним"}</span>
                        <StarRating rating={r.rating} size="sm" />
                        {r.createdAt && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(r.createdAt), "d MMM yyyy", { locale: ru })}
                          </span>
                        )}
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm mb-8">Отзывов пока нет. Будьте первым!</p>
        )}
      </div>
    </div>
  );
}
