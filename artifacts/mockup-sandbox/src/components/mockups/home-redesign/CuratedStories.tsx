import React from "react";
import { 
  Search, MapPin, Bell, ShoppingBag, User, Menu, 
  Truck, Shield, Clock, Cake, Heart, Flower, 
  Gem, Leaf, Building2, Star, ArrowRight, Store, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import "./_group.css";

// --- Types ---
type Product = {
  id: string;
  name: string;
  price: number;
  shopName: string;
  rating: number;
  image: string;
  aspect: "portrait" | "square" | "landscape";
};

type Shop = {
  id: string;
  name: string;
  city: string;
  rating: number;
  deliveryPrice: number;
  image: string;
};

// --- Mock Data ---
const PRODUCTS: Product[] = [
  { id: "1", name: "Романтика красных роз", price: 3490, shopName: "Bloomy", rating: 4.9, image: "/__mockup/images/curated-product-1.png", aspect: "portrait" },
  { id: "2", name: "Нежные пионы", price: 5200, shopName: "Розовый сад", rating: 4.8, image: "/__mockup/images/curated-product-2.png", aspect: "square" },
  { id: "3", name: "Белые тюльпаны", price: 2800, shopName: "Флора Дизайн", rating: 4.7, image: "/__mockup/images/curated-product-3.png", aspect: "landscape" },
  { id: "4", name: "Авторский микс", price: 4100, shopName: "Тюльпановая feya", rating: 5.0, image: "/__mockup/images/product-spring.png", aspect: "portrait" },
  { id: "5", name: "Сборный букет 'Весна'", price: 3100, shopName: "Bloomy", rating: 4.6, image: "/__mockup/images/product-pions.png", aspect: "square" },
  { id: "6", name: "101 роза", price: 12500, shopName: "Империя роз", rating: 4.9, image: "/__mockup/images/product-roses-red-2.png", aspect: "landscape" },
  { id: "7", name: "Нежность орхидей", price: 6000, shopName: "Цветочный рай", rating: 4.8, image: "/__mockup/images/product-wedding.png", aspect: "portrait" },
  { id: "8", name: "Корзина полевых", price: 2990, shopName: "Лесная поляна", rating: 4.7, image: "/__mockup/images/botanical-bouquet-1.png", aspect: "square" },
];

const SHOPS: Shop[] = [
  { id: "s1", name: "Bloomy", city: "Москва", rating: 4.9, deliveryPrice: 300, image: "/__mockup/images/shop-interior.png" },
  { id: "s2", name: "Розовый сад", city: "Санкт-Петербург", rating: 4.8, deliveryPrice: 400, image: "/__mockup/images/botanical-shop-1.png" },
  { id: "s3", name: "Тюльпановая feya", city: "Екатеринбург", rating: 5.0, deliveryPrice: 0, image: "/__mockup/images/shop1-logo.png" },
  { id: "s4", name: "Флора Дизайн", city: "Казань", rating: 4.7, deliveryPrice: 250, image: "/__mockup/images/shop2-logo.png" },
];

const OCCASIONS = [
  { icon: Cake, label: "День рождения", count: 1240 },
  { icon: Heart, label: "Романтика", count: 850 },
  { icon: Flower, label: "8 марта", count: 3200 },
  { icon: Gem, label: "Свадьба", count: 430 },
  { icon: Leaf, label: "Соболезнования", count: 120 },
  { icon: Building2, label: "Корпоративное", count: 560 },
];

// --- Subcomponents ---

const TrustMarquee = () => {
  const items = [
    { icon: Truck, text: "Быстрая доставка — 1–3 часа" },
    { icon: Shield, text: "Гарантия свежести — Только проверенные" },
    { icon: Clock, text: "Удобный заказ — Выберите время" },
  ];

  return (
    <div className="bg-[#f0eff5] text-[#332f3d] py-2 overflow-hidden flex items-center text-xs font-medium uppercase tracking-wider border-b border-[#e1dfeb]">
      <div className="flex w-max animate-marquee">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex shrink-0">
            {items.map((item, j) => (
              <div key={j} className="flex items-center mx-8 shrink-0">
                <item.icon className="w-3.5 h-3.5 mr-2 opacity-70" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const StoryCircle = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex flex-col items-center gap-3 cursor-pointer group w-20 shrink-0">
    <div className="w-16 h-16 rounded-full bg-[#f8f7f9] border border-[#e1dfeb] flex items-center justify-center transition-all duration-300 group-hover:border-[#4a1c40] group-hover:bg-[#4a1c40] group-hover:text-white group-active:scale-95">
      <Icon className="w-6 h-6 stroke-[1.5]" />
    </div>
    <span className="text-[11px] font-semibold text-center text-[#4a4655] leading-tight group-hover:text-[#1a1721]">{label}</span>
  </div>
);

export function CuratedStories() {
  return (
    <div className="min-h-screen bg-[#fcfcfd] font-sans text-[#1a1721]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      {/* --- Header --- */}
      <header className="sticky top-0 z-50 bg-[#fcfcfd]/80 backdrop-blur-md border-b border-[#f0eff5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="lg:hidden p-2 -ml-2 text-[#4a4655] hover:text-[#1a1721]">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <Flower className="w-6 h-6 text-[#4a1c40]" />
              <span className="text-xl font-bold tracking-tight text-[#1a1721]">ЦветоМаркет</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-[#4a4655] cursor-pointer hover:text-[#4a1c40] px-3 py-1.5 rounded-full hover:bg-[#f0eff5] transition-colors">
              <MapPin className="w-4 h-4" />
              <span>Москва</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-[#4a4655]">
            <a href="#" className="text-[#1a1721]">Главная</a>
            <a href="#" className="hover:text-[#1a1721] transition-colors">Каталог</a>
            <a href="#" className="hover:text-[#1a1721] transition-colors">Магазины</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 text-[#4a4655] hover:text-[#1a1721] transition-colors rounded-full hover:bg-[#f0eff5]">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#4a4655] hover:text-[#1a1721] transition-colors rounded-full hover:bg-[#f0eff5] relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#4a1c40] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#fcfcfd]">
                3
              </span>
            </button>
            <button className="hidden sm:flex items-center gap-2 p-2 px-3 text-[#4a4655] hover:text-[#1a1721] transition-colors rounded-full hover:bg-[#f0eff5]">
              <User className="w-5 h-5" />
              <span className="text-sm font-semibold hidden md:block">Войти</span>
            </button>
          </div>
        </div>
        <TrustMarquee />
      </header>

      <main>
        {/* --- Hero --- */}
        <section className="relative h-[80vh] min-h-[600px] flex items-center">
          <div className="absolute inset-0 z-0">
            <img 
              src="/__mockup/images/curated-hero.png" 
              alt="Beautiful floral arrangement" 
              className="w-full h-full object-cover"
            />
            {/* Scrim for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1721]/80 via-[#1a1721]/50 to-transparent mix-blend-multiply" />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <Badge variant="outline" className="text-white border-white/30 backdrop-blur-md bg-white/10 mb-6 py-1.5 px-3 text-xs tracking-wider uppercase">
                Доставка от 60 минут
              </Badge>
              <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
                Свежие цветы для важного события <span className="text-white/70 italic font-light">&</span> без повода
              </h1>
              <p className="text-lg text-white/80 mb-10 max-w-lg font-medium leading-relaxed">
                Стойкие сорта и бережная сборка — чтобы букет радовал долго. Эксклюзивные предложения от лучших флористов.
              </p>

              <div className="glass-panel p-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="relative flex-1 flex items-center">
                  <Search className="absolute left-4 w-5 h-5 text-white/60" />
                  <Input 
                    placeholder="Розы, пионы, свадебный букет..." 
                    className="h-14 pl-12 bg-transparent border-none text-white placeholder:text-white/60 focus-visible:ring-0 text-base"
                  />
                </div>
                <Button className="h-14 px-8 bg-white text-[#1a1721] hover:bg-white/90 rounded-xl text-base font-semibold">
                  Найти
                </Button>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Button variant="link" className="text-white p-0 h-auto font-semibold hover:text-white/80 group">
                  Весь каталог <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <span className="text-white/30">•</span>
                <Button variant="link" className="text-white/80 p-0 h-auto font-medium hover:text-white group">
                  Все магазины
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- Stories/Occasions --- */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xs tracking-widest uppercase font-bold text-[#8c889a] mb-8">По поводу</h2>
            <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {OCCASIONS.map((occ, idx) => (
                <div key={idx} className="snap-start">
                  <StoryCircle icon={occ.icon} label={occ.label} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Curated Products (Masonry-ish) --- */}
        <section className="py-20 bg-[#fcfcfd]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#1a1721] mb-2">Популярные товары</h2>
                <p className="text-[#8c889a] font-medium">Выбор наших клиентов на этой неделе</p>
              </div>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {PRODUCTS.map((product) => (
                <div key={product.id} className="break-inside-avoid group cursor-pointer">
                  <div className={`relative rounded-2xl overflow-hidden bg-[#f0eff5] mb-4 ${
                    product.aspect === 'portrait' ? 'aspect-[3/4]' : 
                    product.aspect === 'landscape' ? 'aspect-[4/3]' : 'aspect-square'
                  }`}>
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-[#4a1c40] text-[#4a1c40]" />
                      <span className="text-xs font-bold">{product.rating}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-[#1a1721] text-base group-hover:text-[#4a1c40] transition-colors line-clamp-1">{product.name}</h3>
                      <span className="font-bold text-[#1a1721] whitespace-nowrap ml-2">{product.price.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex items-center text-sm text-[#8c889a]">
                      <Store className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                      {product.shopName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Featured Shops --- */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#1a1721] mb-2">Избранные магазины</h2>
                <p className="text-[#8c889a] font-medium">Лучшие флористические студии</p>
              </div>
              <Button variant="outline" className="hidden sm:flex rounded-full px-6 font-semibold border-[#e1dfeb] text-[#1a1721] hover:bg-[#f0eff5]">
                Смотреть все
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {SHOPS.map((shop) => (
                <div key={shop.id} className="group cursor-pointer border border-[#e1dfeb] rounded-2xl p-4 hover:border-[#4a1c40] transition-colors bg-[#fcfcfd]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-[#f0eff5] shrink-0 border border-[#e1dfeb]">
                      <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a1721] group-hover:text-[#4a1c40] transition-colors">{shop.name}</h3>
                      <div className="flex items-center text-xs text-[#8c889a] mt-0.5">
                        <MapPin className="w-3 h-3 mr-1" />
                        {shop.city}
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-[#e1dfeb] mb-4" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-[#1a1721]">{shop.rating}</span>
                    </div>
                    <div className="text-[#8c889a] flex items-center">
                      <Truck className="w-4 h-4 mr-1.5" />
                      {shop.deliveryPrice === 0 ? (
                        <span className="text-green-600 font-medium">Бесплатно</span>
                      ) : (
                        <span>{shop.deliveryPrice} ₽</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- CTA For Shops --- */}
        <section className="py-10 bg-[#4a1c40] relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <Store className="w-8 h-8 text-white/50 shrink-0 hidden sm:block" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
                  Откройте свой цветочный магазин
                </h2>
                <p className="text-sm text-white/70 font-medium">
                  Присоединяйтесь к платформе и начните получать заказы уже сегодня.
                </p>
              </div>
            </div>
            <Button className="h-11 px-6 bg-white text-[#4a1c40] hover:bg-white/90 rounded-full text-sm font-bold shadow-xl hover:scale-105 transition-all shrink-0">
              Начать продавать <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </section>

      </main>
      
      {/* Footer with hero-based background image */}
      <footer className="relative overflow-hidden py-14">
        <div className="absolute inset-0 z-0">
          <img
            src="/__mockup/images/curated-hero.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#1a1721]/90" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <Flower className="w-5 h-5 text-white/70" />
              <span className="font-bold text-white">ЦветоМаркет</span>
            </div>
            <div className="flex gap-6 text-sm font-medium text-white/60">
              <a href="#" className="hover:text-white transition-colors">О нас</a>
              <a href="#" className="hover:text-white transition-colors">Партнерам</a>
              <a href="#" className="hover:text-white transition-colors">Поддержка</a>
            </div>
          </div>
          <Separator className="bg-white/10 mb-6" />
          <p className="text-center text-xs text-white/40 font-medium">© 2024 ЦветоМаркет. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
