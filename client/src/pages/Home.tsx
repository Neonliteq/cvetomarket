import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, Shield, Clock, Star, Cake, Heart, Flower2, Gem, Leaf, Building2, Search, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { ShopCard } from "@/components/ShopCard";
import type { Product, Shop, Category } from "@shared/schema";

type CategoryWithCount = Category & { productCount: number };

const SLUG_ICONS: Record<string, LucideIcon> = {
  birthday: Cake,
  romance: Heart,
  march8: Flower2,
  wedding: Gem,
  sympathy: Leaf,
  corporate: Building2,
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/catalog?q=${encodeURIComponent(q)}`);
    else navigate("/catalog");
  };

  const { data: featured, isLoading: loadingFeatured } = useQuery<(Product & { shopName?: string; categoryName?: string })[]>({
    queryKey: ["/api/products/featured"],
  });
  const { data: shops, isLoading: loadingShops } = useQuery<(Shop & { cityName?: string })[]>({
    queryKey: ["/api/shops/all"],
  });
  const { data: popularCategories, isLoading: loadingCategories } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories/popular"],
  });

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div
          className="min-h-[500px] md:min-h-[600px] flex items-center"
          style={{
            background: "linear-gradient(135deg, hsl(338 75% 45% / 0.15) 0%, hsl(338 75% 45% / 0.05) 50%, transparent 100%)",
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/hero-flowers.png')", opacity: 0.25 }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, hsl(var(--background)) 30%, transparent)" }} />

          <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
            <div className="max-w-xl space-y-6">
              <Badge className="w-fit">Доставка от 60 минут</Badge>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Свежие букеты<br />
                <span className="text-primary">прямо к вашей двери</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                {shops && shops.length > 0
                  ? `${shops.length} ${shops.length === 1 ? "цветочный магазин" : shops.length < 5 ? "цветочных магазина" : "цветочных магазинов"}.`
                  : "Цветочные магазины."}{" "}
                Выберите идеальный букет и оформите доставку за несколько минут.
              </p>
              <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Розы, пионы, свадебный букет..."
                    className="pl-9 h-11 bg-background/90 backdrop-blur"
                    data-testid="input-home-search"
                  />
                </div>
                <Button type="submit" size="lg" className="h-11 px-5" data-testid="button-home-search">
                  Найти
                </Button>
              </form>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/catalog">
                  <Button size="sm" variant="outline" data-testid="button-view-catalog">
                    Весь каталог
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/shops">
                  <Button size="sm" variant="ghost" data-testid="button-view-shops">
                    Все магазины
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-primary/5 border-y border-primary/10">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Truck, title: "Быстрая доставка", desc: "Доставим за 1–3 часа по городу" },
            { icon: Shield, title: "Гарантия свежести", desc: "Только свежие цветы от проверенных магазинов" },
            { icon: Clock, title: "Удобный заказ", desc: "Выберите удобное время доставки" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        <section>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">По поводу</h2>
              <p className="text-muted-foreground text-sm mt-1">Найдите букет для любого случая</p>
            </div>
            <Link href="/catalog">
              <Button variant="ghost" size="sm" className="text-xs">
                Все категории <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
          {loadingCategories ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-md" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {(popularCategories ?? []).slice(0, 6).map((cat) => {
                const Icon = SLUG_ICONS[cat.slug] ?? Flower2;
                const count = Number(cat.productCount);
                return (
                  <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}>
                    <div
                      className="hover-elevate cursor-pointer rounded-md border border-border bg-card p-3 flex flex-col items-center gap-2 text-center transition-colors"
                      data-testid={`button-occasion-${cat.slug}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium leading-tight">{cat.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] text-muted-foreground">{count} {count === 1 ? "товар" : count < 5 ? "товара" : "товаров"}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Популярные товары</h2>
              <p className="text-muted-foreground text-sm mt-1">Букеты и подарки нашего маркетплейса</p>
            </div>
            <Link href="/catalog">
              <Button variant="outline" size="sm">
                Весь каталог <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
          {loadingFeatured ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-lg" />)}
            </div>
          ) : featured?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} shopId={p.shopId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Скоро здесь появятся букеты</p>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Магазины</h2>
              <p className="text-muted-foreground text-sm mt-1">Проверенные цветочные магазины</p>
            </div>
            <Link href="/shops">
              <Button variant="outline" size="sm">
                Все магазины <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
          {loadingShops ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
          ) : shops?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shops.slice(0, 4).map((s) => (
                <ShopCard key={s.id} shop={s} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Магазины скоро появятся</p>
            </div>
          )}
        </section>

        <section className="rounded-lg bg-primary/5 border border-primary/10 p-8 text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Star className="w-10 h-10 text-primary fill-primary/30" />
          </div>
          <h2 className="text-2xl font-bold">Откройте свой цветочный магазин</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Продавайте букеты тысячам покупателей. Простое управление, удобные инструменты.
          </p>
          <Link href="/auth?role=shop">
            <Button size="lg">Начать продавать</Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
