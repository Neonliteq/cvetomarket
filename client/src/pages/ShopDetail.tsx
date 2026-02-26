import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Clock, Phone, Mail, MessageCircle, TrendingUp, Tag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCard } from "@/components/ProductCard";
import { StarRating } from "@/components/StarRating";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { Shop, Product } from "@shared/schema";

type ProductWithMeta = Product & { shopName?: string; categoryName?: string };

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      {count !== undefined && (
        <span className="text-muted-foreground font-normal text-sm">({count})</span>
      )}
    </div>
  );
}

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: shop, isLoading: loadingShop } = useQuery<Shop & { cityName?: string }>({
    queryKey: [`/api/shops/${id}`],
  });

  const { data: products, isLoading: loadingProducts } = useQuery<ProductWithMeta[]>({
    queryKey: [`/api/shops/${id}/products`],
    enabled: !!id,
  });

  if (loadingShop) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-4">
          <Skeleton className="w-20 h-20 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!shop) return <div className="text-center py-20">Магазин не найден</div>;

  const activeProducts = (products || []).filter((p) => p.isActive && p.inStock);

  const popularProducts = [...activeProducts]
    .filter((p) => Number(p.rating) >= 4 || (p.reviewCount || 0) > 0)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 8);

  const discountProducts = activeProducts
    .filter((p) => ((p as any).discountPercent || 0) > 0)
    .sort((a, b) => ((b as any).discountPercent || 0) - ((a as any).discountPercent || 0));

  const recommendedProducts = activeProducts
    .filter((p) => (p as any).isRecommended);

  const otherProducts = activeProducts.filter((p) => {
    const isPopular = popularProducts.some((pp) => pp.id === p.id);
    const isDiscount = discountProducts.some((dp) => dp.id === p.id);
    const isRecommended = recommendedProducts.some((rp) => rp.id === p.id);
    return !isPopular && !isDiscount && !isRecommended;
  });

  const hasSections = popularProducts.length > 0 || discountProducts.length > 0 || recommendedProducts.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/shops">
        <Button variant="ghost" size="sm" className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Все магазины
        </Button>
      </Link>

      {(shop as any).coverUrl && (
        <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden mb-6">
          <img src={(shop as any).coverUrl} alt={`${shop.name} обложка`} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <Avatar className="w-24 h-24 rounded-lg shrink-0">
          <AvatarImage src={shop.logoUrl || undefined} alt={shop.name} className="object-cover" />
          <AvatarFallback className="rounded-lg text-2xl font-bold bg-primary/10 text-primary">
            {shop.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            {Number(shop.rating) > 0 && (
              <StarRating rating={Number(shop.rating)} size="md" showValue count={shop.reviewCount || 0} className="mt-1" />
            )}
          </div>
          {shop.description && <p className="text-muted-foreground text-sm">{shop.description}</p>}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {shop.cityName && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{shop.cityName}</span>
            )}
            {shop.workingHours && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{shop.workingHours}</span>
            )}
            {shop.phone && (
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{shop.phone}</span>
            )}
            {shop.email && (
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{shop.email}</span>
            )}
          </div>
          {shop.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{shop.address}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {shop.deliveryPrice !== undefined && (
              <Badge variant="secondary" data-testid="badge-delivery-price">
                Доставка: {Number(shop.deliveryPrice) === 0 ? "Бесплатно" : `${Number(shop.deliveryPrice).toLocaleString("ru-RU")} ₽`}
              </Badge>
            )}
            {shop.deliveryZone && (
              <Badge variant="secondary">Зона доставки: {shop.deliveryZone}</Badge>
            )}
          </div>
          {user && (
            <Button
              variant="outline"
              className="gap-2 w-fit"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/shops/${id}/owner`, { credentials: "include" });
                  const data = await res.json();
                  if (data.ownerId) {
                    await apiRequest("POST", "/api/messages", {
                      receiverId: data.ownerId,
                      content: `Здравствуйте! У меня вопрос по магазину «${shop.name}»`,
                    });
                    navigate(`/chat?userId=${data.ownerId}`);
                  }
                } catch {
                  navigate("/chat");
                }
              }}
              data-testid="button-chat-shop"
            >
              <MessageCircle className="w-4 h-4" />
              Написать продавцу
            </Button>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      {loadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-lg" />)}
        </div>
      ) : activeProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>В этом магазине пока нет товаров</p>
        </div>
      ) : (
        <div className="space-y-12">
          {recommendedProducts.length > 0 && (
            <section data-testid="section-recommended">
              <SectionHeader icon={<Star className="w-4 h-4" />} title="Магазин рекомендует" count={recommendedProducts.length} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recommendedProducts.map((p) => <ProductCard key={p.id} product={p} shopId={id} />)}
              </div>
            </section>
          )}

          {discountProducts.length > 0 && (
            <section data-testid="section-discounts">
              <SectionHeader icon={<Tag className="w-4 h-4" />} title="Скидки" count={discountProducts.length} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {discountProducts.map((p) => <ProductCard key={p.id} product={p} shopId={id} />)}
              </div>
            </section>
          )}

          {popularProducts.length > 0 && (
            <section data-testid="section-popular">
              <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Популярные" count={popularProducts.length} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {popularProducts.map((p) => <ProductCard key={p.id} product={p} shopId={id} />)}
              </div>
            </section>
          )}

          {(!hasSections || otherProducts.length > 0) && (
            <section data-testid="section-all">
              <SectionHeader
                icon={<MapPin className="w-4 h-4" />}
                title={hasSections ? "Все товары" : "Товары магазина"}
                count={hasSections ? otherProducts.length : activeProducts.length}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(hasSections ? otherProducts : activeProducts).map((p) => (
                  <ProductCard key={p.id} product={p} shopId={id} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
