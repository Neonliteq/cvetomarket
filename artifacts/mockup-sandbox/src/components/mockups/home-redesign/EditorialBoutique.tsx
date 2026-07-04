import React from "react";
import { 
  Flower2, MapPin, Search, ShoppingBag, Bell, Menu, 
  Truck, ShieldCheck, Clock, User, ArrowRight,
  Star, Heart, Cake, Gem, Leaf, Building
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const products = [
  { id: 1, name: "Пионы нежность", price: "3 200 ₽", shop: "Bloomy", rating: 4.8, image: "/__mockup/images/product-peonies.png" },
  { id: 2, name: "Букет из 25 роз", price: "2 490 ₽", shop: "Розовый сад", rating: 4.9, image: "/__mockup/images/category-romance.png" },
  { id: 3, name: "Весенний микс", price: "4 150 ₽", shop: "Цветочная мастерская", rating: 5.0, image: "/__mockup/images/editorial-hero.png" },
  { id: 4, name: "Свадебная классика", price: "5 500 ₽", shop: "Тюльпановая feya", rating: 4.7, image: "/__mockup/images/category-wedding.png" },
  { id: 5, name: "Персиковые сны", price: "2 800 ₽", shop: "Bloomy", rating: 4.6, image: "/__mockup/images/product-peonies.png" },
  { id: 6, name: "Страсть", price: "3 900 ₽", shop: "Розовый сад", rating: 4.9, image: "/__mockup/images/category-romance.png" },
  { id: 7, name: "Лесной аромат", price: "2 100 ₽", shop: "Цветочная мастерская", rating: 4.8, image: "/__mockup/images/editorial-hero.png" },
  { id: 8, name: "Невеста", price: "6 200 ₽", shop: "Тюльпановая feya", rating: 5.0, image: "/__mockup/images/category-wedding.png" },
];

const shops = [
  { id: 1, name: "Bloomy", city: "Москва", rating: 4.8, delivery: "от 300 ₽", img: "/__mockup/images/shop-interior.png" },
  { id: 2, name: "Розовый сад", city: "Москва", rating: 4.9, delivery: "Бесплатно", img: "/__mockup/images/editorial-hero.png" },
  { id: 3, name: "Тюльпановая feya", city: "Москва", rating: 4.7, delivery: "от 400 ₽", img: "/__mockup/images/shop-interior.png" },
  { id: 4, name: "Botanica", city: "Москва", rating: 5.0, delivery: "Бесплатно", img: "/__mockup/images/category-wedding.png" },
];

export function EditorialBoutique() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .bg-cream { background-color: #fbfaf8; }
        .text-ink { color: #2c2a26; }
        .border-line { border-color: #e6e2db; }
      `}</style>
      
      <div className="font-sans antialiased text-ink bg-cream min-h-screen">
        
        {/* Utility Bar */}
        <div className="border-b border-line text-[11px] md:text-xs uppercase tracking-wider bg-[#f4f2ec]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
            <div className="hidden lg:flex items-center space-x-6 text-[#5c5850]">
              <span className="flex items-center gap-1.5"><Truck size={12} /> Доставим за 1–3 часа</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Только свежие цветы</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Выберите удобное время</span>
            </div>
            
            <div className="flex items-center space-x-6 ml-auto">
              <button className="flex items-center gap-1.5 hover:text-black transition-colors">
                <MapPin size={12} />
                <span>Москва</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-black transition-colors font-medium">
                <User size={12} />
                <span>Войти</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <header className="border-b border-line bg-cream sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4 lg:hidden">
              <button className="p-2 -ml-2"><Menu size={20} strokeWidth={1.5} /></button>
            </div>

            <div className="flex items-center gap-8">
              <a href="#" className="flex items-center gap-2 group">
                <Flower2 size={28} strokeWidth={1} className="text-ink group-hover:rotate-12 transition-transform duration-500" />
                <span className="font-serif text-2xl font-semibold tracking-tight">ЦветоМаркет</span>
              </a>
              
              <nav className="hidden lg:flex items-center gap-8 ml-8 text-sm">
                <a href="#" className="hover:opacity-60 transition-opacity">Главная</a>
                <a href="#" className="hover:opacity-60 transition-opacity">Каталог</a>
                <a href="#" className="hover:opacity-60 transition-opacity">Магазины</a>
              </nav>
            </div>

            <div className="flex items-center gap-5">
              <button className="p-2 hover:opacity-60 transition-opacity hidden md:block">
                <Bell size={20} strokeWidth={1.5} />
              </button>
              <button className="flex items-center gap-2 hover:opacity-60 transition-opacity group">
                <div className="relative">
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  <span className="absolute -top-1.5 -right-1.5 bg-ink text-cream text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium group-hover:scale-110 transition-transform">0</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Trust Strip (visible only on mobile) */}
        <div className="lg:hidden border-b border-line bg-[#f4f2ec] py-3 px-4">
          <div className="flex flex-col gap-2 text-xs text-[#5c5850]">
             <span className="flex items-center gap-2"><Truck size={14} /> Доставим за 1–3 часа по городу</span>
             <span className="flex items-center gap-2"><ShieldCheck size={14} /> Только свежие цветы от проверенных магазинов</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 min-h-[600px]">
              <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-16 lg:py-20 lg:pr-16 z-10 relative">
                <Badge variant="outline" className="w-fit rounded-none border-ink text-ink mb-8 text-xs px-3 py-1 uppercase tracking-widest font-normal">
                  Доставка от 60 минут
                </Badge>
                
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.1] mb-6">
                  Свежие цветы<br/>
                  <span className="italic text-[#7a756b]">для важного события</span><br/>
                  и без повода.
                </h1>
                
                <p className="text-[#5c5850] text-lg max-w-md mb-10 leading-relaxed font-light">
                  Стойкие сорта и бережная сборка — чтобы букет радовал долго.
                </p>

                <div className="max-w-md w-full mb-10">
                  <div className="relative flex items-center">
                    <Input 
                      placeholder="Розы, пионы, свадебный букет..." 
                      className="rounded-none border-ink h-14 pl-4 pr-32 bg-transparent focus-visible:ring-0 focus-visible:border-ink"
                    />
                    <Button className="absolute right-1 top-1 bottom-1 rounded-none bg-ink text-cream hover:bg-[#1a1917] h-12 px-6">
                      Найти
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="outline" className="rounded-none border-ink text-ink hover:bg-ink hover:text-cream h-12 px-8 uppercase tracking-wider text-xs">
                    Весь каталог
                  </Button>
                  <Button variant="ghost" className="rounded-none h-12 px-8 uppercase tracking-wider text-xs hover:bg-transparent hover:opacity-60">
                    Все магазины
                  </Button>
                </div>
              </div>
              
              <div className="relative h-[400px] lg:h-auto border-l border-line lg:block hidden">
                <img 
                  src="/__mockup/images/editorial-hero.png" 
                  alt="Elegant floral arrangement" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Categories / Occasions */}
        <section className="py-24 border-b border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <h2 className="font-serif text-4xl">По поводу</h2>
              <a href="#" className="text-sm uppercase tracking-wider hover:opacity-60 flex items-center gap-2 border-b border-ink pb-1">
                Все категории <ArrowRight size={14} />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-[250px]">
              <div className="lg:col-span-2 lg:row-span-2 relative group overflow-hidden bg-[#ebe7df]">
                <img src="/__mockup/images/category-wedding.png" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Свадьба" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-500" />
                <div className="absolute bottom-6 left-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Gem size={18} strokeWidth={1.5} />
                    <span className="text-xs uppercase tracking-widest opacity-80">142 букета</span>
                  </div>
                  <h3 className="font-serif text-3xl">Свадьба</h3>
                </div>
              </div>

              <div className="relative group overflow-hidden bg-[#ebe7df]">
                <img src="/__mockup/images/category-romance.png" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Романтика" />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-6 left-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={16} strokeWidth={1.5} />
                    <span className="text-xs uppercase tracking-widest opacity-80">350 букетов</span>
                  </div>
                  <h3 className="font-serif text-2xl">Романтика</h3>
                </div>
              </div>

              <div className="relative group overflow-hidden bg-[#ebe7df] flex flex-col justify-end p-6 border border-line hover:border-ink transition-colors">
                <div className="flex items-center gap-2 mb-2 text-[#5c5850]">
                  <Cake size={16} strokeWidth={1.5} />
                  <span className="text-xs uppercase tracking-widest">280 букетов</span>
                </div>
                <h3 className="font-serif text-2xl text-ink">День рождения</h3>
              </div>

              <div className="relative group overflow-hidden bg-[#ebe7df] flex flex-col justify-end p-6 border border-line hover:border-ink transition-colors">
                <div className="flex items-center gap-2 mb-2 text-[#5c5850]">
                  <Flower2 size={16} strokeWidth={1.5} />
                  <span className="text-xs uppercase tracking-widest">120 букетов</span>
                </div>
                <h3 className="font-serif text-2xl text-ink">8 марта</h3>
              </div>

              <div className="relative group overflow-hidden bg-[#ebe7df]">
                 <img src="/__mockup/images/product-peonies.png" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Корпоративное" />
                 <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-6 left-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Building size={16} strokeWidth={1.5} />
                    <span className="text-xs uppercase tracking-widest opacity-80">45 букетов</span>
                  </div>
                  <h3 className="font-serif text-2xl">Корпоративное</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Products */}
        <section className="py-24 border-b border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <h2 className="font-serif text-4xl">Популярное</h2>
              <a href="#" className="text-sm uppercase tracking-wider hover:opacity-60 flex items-center gap-2 border-b border-ink pb-1">
                Смотреть все <ArrowRight size={14} />
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
              {products.map((product) => (
                <div key={product.id} className="group cursor-pointer">
                  <div className="relative aspect-[4/5] mb-4 overflow-hidden bg-[#ebe7df]">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="bg-white/90 p-2 rounded-full hover:bg-white text-ink">
                        <ShoppingBag size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-lg leading-tight">{product.name}</h3>
                      <span className="font-serif text-lg">{product.price}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#5c5850]">
                      <span>{product.shop}</span>
                      <span className="w-1 h-1 rounded-full bg-[#d4d0c8]"></span>
                      <span className="flex items-center gap-0.5">
                        <Star size={10} className="fill-current" /> {product.rating}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Shops */}
        <section className="py-24 border-b border-line bg-[#f4f2ec]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <h2 className="font-serif text-4xl">Магазины</h2>
              <a href="#" className="text-sm uppercase tracking-wider hover:opacity-60 flex items-center gap-2 border-b border-ink pb-1">
                Все магазины <ArrowRight size={14} />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {shops.map((shop) => (
                <div key={shop.id} className="group cursor-pointer border border-line bg-cream hover:border-ink transition-colors">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img 
                      src={shop.img} 
                      alt={shop.name}
                      className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    />
                  </div>
                  <div className="p-5 border-t border-line">
                    <h3 className="font-serif text-xl mb-2">{shop.name}</h3>
                    <div className="flex items-center justify-between text-xs text-[#5c5850]">
                      <span className="flex items-center gap-1"><MapPin size={12} /> {shop.city}</span>
                      <span className="flex items-center gap-1"><Star size={12} className="fill-current" /> {shop.rating}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-line/50 text-xs flex justify-between">
                      <span className="uppercase tracking-wider">Доставка</span>
                      <span className="font-medium">{shop.delivery}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-ink text-cream text-center px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Откройте свой цветочный магазин</h2>
            <p className="text-[#a8a39a] text-lg mb-10 max-w-xl mx-auto font-light">
              Присоединяйтесь к маркетплейсу и начните получать заказы уже сегодня. Мы берем на себя привлечение клиентов и удобные инструменты продаж.
            </p>
            <Button className="rounded-none bg-cream text-ink hover:bg-white h-14 px-10 text-sm uppercase tracking-widest font-medium">
              Начать продавать
            </Button>
          </div>
        </section>

      </div>
    </>
  );
}

export default EditorialBoutique;
