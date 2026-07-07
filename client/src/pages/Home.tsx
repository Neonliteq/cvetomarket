import { useState } from "react";
import heroBg from "@assets/hero_bg_generated.png";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, ArrowUpRight, Star, Cake, Heart, Flower2, Gem, Leaf,
  Building2, Search, Truck, type LucideIcon,
} from "lucide-react";
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

const CATEGORY_IMAGES: Record<string, string> = {
  romance: "/images/product-romantic.png",
  march8: "/images/hero-flowers.png",
  wedding: "/images/product-wedding.png",
  birthday: "/images/product-pions.png",
  sympathy: "/images/product-sympathy.png",
  corporate: "/images/product-corporate.png",
};

const FEATURED_SLUGS = ["romance", "march8", "wedding"];

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

  const featuredCats = (popularCategories ?? []).filter(c => FEATURED_SLUGS.includes(c.slug));
  const moreCats = (popularCategories ?? []).filter(c => !FEATURED_SLUGS.includes(c.slug));

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-[#1a1721]">

      {/* ── Hero ── */}
      <section className="relative h-[82vh] min-h-[580px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1721]/80 via-[#1a1721]/45 to-transparent" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="text-white border-white/30 backdrop-blur-md bg-white/10 mb-6 py-1.5 px-3 text-xs tracking-wider uppercase"
            >
              Доставка от 60 минут
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
              Свежие цветы для важного события{" "}
              <span className="text-white/60 italic font-light">&</span> без повода
            </h1>
            <p className="text-lg text-white/75 mb-10 max-w-lg leading-relaxed">
              Стойкие сорта и бережная сборка — чтобы букет радовал долго.
            </p>

            <form
              onSubmit={handleSearch}
              className="p-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col sm:flex-row gap-2 max-w-xl"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-white/60 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Розы, пионы, свадебный букет..."
                  className="h-14 pl-12 bg-transparent border-none text-white placeholder:text-white/55 focus-visible:ring-0 text-base"
                  data-testid="input-home-search"
                />
              </div>
              <Button
                type="submit"
                className="h-14 px-8 bg-white text-[#1a1721] hover:bg-white/90 rounded-xl text-base font-semibold"
                data-testid="button-home-search"
              >
                Найти
              </Button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <Link href="/catalog">
                <Button
                  variant="link"
                  className="text-white p-0 h-auto font-semibold hover:text-white/80 group"
                  data-testid="button-view-catalog"
                >
                  Весь каталог{" "}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <span className="text-white/30">•</span>
              <Link href="/shops">
                <Button
                  variant="link"
                  className="text-white/75 p-0 h-auto font-medium hover:text-white"
                  data-testid="button-view-shops"
                >
                  Все магазины
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Occasions ── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-xs tracking-widest uppercase font-bold text-[#8c889a]">По поводу</h2>
            <Link href="/catalog">
              <span className="text-sm font-semibold text-primary cursor-pointer hover:underline">
                Все поводы
              </span>
            </Link>
          </div>

          {loadingCategories ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {/* 3 featured editorial photo cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                {(featuredCats.length > 0 ? featuredCats : (popularCategories ?? []).slice(0, 3)).map((cat) => {
                  const Icon = SLUG_ICONS[cat.slug] ?? Flower2;
                  const img = CATEGORY_IMAGES[cat.slug];
                  const count = Number(cat.productCount);
                  return (
                    <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}>
                      <div
                        className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/5]"
                        data-testid={`button-occasion-${cat.slug}`}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={cat.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1721]/85 via-[#1a1721]/10 to-transparent" />

                        <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
                          <Icon className="w-4 h-4 stroke-[1.5]" />
                        </div>
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h3 className="text-2xl text-white font-semibold mb-1 leading-tight">
                            {cat.name}
                          </h3>
                          {count > 0 && (
                            <span className="text-xs font-semibold text-white/65 uppercase tracking-wide">
                              {count} {count === 1 ? "товар" : count < 5 ? "товара" : "товаров"}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Secondary occasions as pill buttons */}
              {moreCats.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {moreCats.map((cat) => {
                    const Icon = SLUG_ICONS[cat.slug] ?? Flower2;
                    const count = Number(cat.productCount);
                    return (
                      <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}>
                        <button
                          className="group flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full border border-[#e1dfeb] bg-white hover:border-primary hover:bg-primary transition-colors"
                          data-testid={`button-occasion-${cat.slug}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-[#f0eff5] group-hover:bg-white/15 flex items-center justify-center transition-colors">
                            <Icon className="w-3.5 h-3.5 text-[#4a4655] group-hover:text-white stroke-[1.5]" />
                          </span>
                          <span className="text-sm font-semibold text-[#4a4655] group-hover:text-white transition-colors">
                            {cat.name}
                          </span>
                          {count > 0 && (
                            <span className="text-xs font-medium text-[#a8a4b5] group-hover:text-white/60 transition-colors">
                              {count}
                            </span>
                          )}
                        </button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Popular Products (masonry-ish) ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#1a1721] mb-1">Популярные товары</h2>
              <p className="text-[#8c889a] font-medium text-sm">Выбор наших клиентов на этой неделе</p>
            </div>
            <Link href="/catalog">
              <Button variant="outline" size="sm" className="rounded-full border-[#e1dfeb] text-[#1a1721] hover:bg-[#f0eff5]">
                Весь каталог <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-2xl break-inside-avoid mb-5" />
              ))}
            </div>
          ) : featured?.length ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
              {featured.slice(0, 8).map((p) => (
                <div key={p.id} className="break-inside-avoid mb-5">
                  <ProductCard product={p} shopId={p.shopId} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-[#8c889a]">
              <p>Скоро здесь появятся букеты</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Shops ── */}
      <section className="py-16 bg-[#fcfcfd]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#1a1721] mb-1">Избранные магазины</h2>
              <p className="text-[#8c889a] font-medium text-sm">Лучшие флористические студии платформы</p>
            </div>
            <Link href="/shops">
              <Button variant="outline" size="sm" className="rounded-full border-[#e1dfeb] text-[#1a1721] hover:bg-[#f0eff5]">
                Все магазины <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {loadingShops ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : shops?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {shops.slice(0, 4).map((s) => (
                <ShopCard key={s.id} shop={s} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-[#8c889a]">
              <p>Магазины скоро появятся</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-10 bg-primary relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <Flower2 className="w-8 h-8 text-primary-foreground/50 shrink-0 hidden sm:block" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary-foreground mb-1">
                Откройте свой цветочный магазин
              </h2>
              <p className="text-sm text-primary-foreground/70 font-medium">
                Присоединяйтесь к платформе и начните получать заказы уже сегодня.
              </p>
            </div>
          </div>
          <Link href="/seller-auth">
            <Button className="h-11 px-6 bg-white text-primary hover:bg-white/90 rounded-full text-sm font-bold shadow-xl shrink-0">
              Начать продавать <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
