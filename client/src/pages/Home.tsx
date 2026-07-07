import { useState, useMemo } from "react";
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

  const bannerProduct = useMemo(() => {
    if (!featured?.length) return null;
    return featured[Math.floor(Math.random() * featured.length)];
  }, [featured]);

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

      {/* ── Promo Banner ── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[400px] shadow-lg bg-white border border-[#e1dfeb]">

            {/* Left — editorial text */}
            <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-10 relative overflow-hidden">
              {/* Decorative background letter */}
              <span className="absolute -top-6 -left-3 text-[160px] font-black text-primary/5 leading-none select-none pointer-events-none">
                Ц
              </span>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 rounded-full bg-primary" />
                  <span className="text-[11px] tracking-[0.2em] uppercase text-primary font-semibold">
                    Для каждого случая
                  </span>
                </div>

                <h2 className="text-3xl md:text-[38px] font-black text-[#1a1721] leading-[1.15] mb-3">
                  Найдите букет,<br />
                  который{" "}
                  <span className="text-primary relative inline-block">
                    тронет
                    <svg className="absolute -bottom-1 left-0 w-full" height="4" viewBox="0 0 100 4" preserveAspectRatio="none">
                      <path d="M0 3 Q25 0 50 3 Q75 6 100 3" stroke="hsl(338 75% 45%)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    </svg>
                  </span>{" "}
                  сердце
                </h2>

                <p className="text-[14px] text-[#6b5f78] leading-relaxed mb-7 max-w-xs">
                  Ручная сборка от флористов, которые любят своё дело. Доставка по городу от 1 часа.
                </p>

                {/* Category chips */}
                {(popularCategories ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {(popularCategories ?? []).slice(0, 5).map((cat) => {
                      const Icon = SLUG_ICONS[cat.slug] ?? Flower2;
                      return (
                        <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}>
                          <span
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#f0eff5] text-[#4a4655] border border-[#e1dfeb] hover:bg-primary hover:text-white hover:border-transparent cursor-pointer transition-all"
                            data-testid={`button-occasion-${cat.slug}`}
                          >
                            <Icon className="w-3 h-3 stroke-[1.5]" />
                            {cat.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {loadingCategories && (
                  <div className="flex gap-2 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
                  </div>
                )}

                <Link href="/catalog">
                  <Button className="bg-[#1a1721] hover:bg-[#2d1a35] text-white rounded-full px-7 font-bold" data-testid="button-banner-catalog">
                    В каталог <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — random product in circle frame */}
            <div className="w-full md:w-[380px] shrink-0 flex items-center justify-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(338 75% 96%) 0%, hsl(338 60% 92%) 50%, hsl(280 40% 93%) 100%)" }}>

              {/* Decorative soft ring */}
              <div className="absolute w-72 h-72 rounded-full border-[20px] border-white/50" />

              {loadingFeatured ? (
                <Skeleton className="w-60 h-60 rounded-full" />
              ) : bannerProduct ? (
                <Link href={`/product/${bannerProduct.id}`} data-testid="link-banner-product">
                  <div className="relative z-10 w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white cursor-pointer group">
                    {bannerProduct.images?.[0] ? (
                      <img
                        src={bannerProduct.images[0]}
                        alt={bannerProduct.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src="/images/hero-flowers.png"
                        alt={bannerProduct.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full shadow">
                        Смотреть →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="relative z-10 w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white">
                  <img src="/images/hero-flowers.png" alt="Букет" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Price badge */}
              {bannerProduct && (
                <Link href={`/product/${bannerProduct.id}`}>
                  <div className="absolute bottom-10 left-8 z-20 bg-white rounded-2xl px-4 py-2.5 shadow-lg border border-[#f0eff5] cursor-pointer hover:shadow-xl transition-shadow">
                    <p className="text-[11px] text-[#a8a4b5] font-medium leading-none mb-0.5">
                      {bannerProduct.shopName ?? "Магазин"}
                    </p>
                    <p className="text-base font-black text-[#1a1721] leading-none">
                      {Number(bannerProduct.price).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </Link>
              )}
            </div>

          </div>
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
      <section className="py-10 bg-foreground relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <Flower2 className="w-8 h-8 text-background/30 shrink-0 hidden sm:block" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-background mb-1">
                Откройте свой цветочный магазин
              </h2>
              <p className="text-sm text-background/60 font-medium">
                Присоединяйтесь к платформе и начните получать заказы уже сегодня.
              </p>
            </div>
          </div>
          <Link href="/seller-auth">
            <Button className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-sm font-bold shadow-xl shrink-0">
              Начать продавать <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
