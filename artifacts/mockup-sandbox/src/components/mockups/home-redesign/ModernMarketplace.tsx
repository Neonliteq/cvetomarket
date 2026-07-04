import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Bell, ShoppingCart, User, Menu, Truck, ShieldCheck, Clock, Heart, Star, Cake, Flower2, Gem, Leaf, Building2, ChevronRight, ArrowRight } from 'lucide-react';

export default function ModernMarketplace() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] font-['Space_Grotesk',sans-serif] text-slate-900 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Header - Dense, compact, marketplace style */}
      <header className="sticky top-0 z-50 bg-white border-b-2 border-black">
        {/* Top trust strip integrated into header */}
        <div className="bg-blue-600 text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider py-1.5 px-4 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-1.5"><Truck className="w-3 h-3" /> <span>Доставим за 1–3 часа</span></div>
          <div className="hidden sm:flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> <span>Только свежие цветы</span></div>
          <div className="hidden md:flex items-center gap-1.5"><Clock className="w-3 h-3" /> <span>Удобное время доставки</span></div>
        </div>
        
        <div className="px-4 py-3 flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Logo & City */}
          <div className="flex items-center gap-4 shrink-0">
            <Menu className="w-6 h-6 lg:hidden cursor-pointer" />
            <a href="#" className="flex items-center gap-2 text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
              <div className="bg-black text-white p-1.5 rounded-md"><Flower2 className="w-5 h-5" /></div>
              <span className="hidden sm:inline">ЦВЕТОМАРКЕТ</span>
            </a>
            <div className="hidden lg:flex items-center gap-1 text-sm font-medium hover:bg-slate-100 py-1 px-2 rounded-md cursor-pointer border border-transparent hover:border-black transition-colors">
              <MapPin className="w-4 h-4" />
              <span>Москва</span>
            </div>
            
            <nav className="hidden lg:flex items-center gap-4 ml-4 text-sm font-bold">
              <a href="#" className="hover:text-blue-600 transition-colors">Главная</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Каталог</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Магазины</a>
            </nav>
          </div>

          {/* Search - Big & Prominent */}
          <div className="flex-1 max-w-2xl hidden md:flex">
            <div className="relative w-full flex">
              <Input 
                className="rounded-r-none border-2 border-black border-r-0 h-11 focus-visible:ring-0 text-base font-medium" 
                placeholder="Розы, пионы, свадебный букет..." 
              />
              <Button className="rounded-l-none border-2 border-black bg-black hover:bg-blue-600 hover:border-blue-600 h-11 px-6">
                <Search className="w-5 h-5" />
                <span className="ml-2 font-bold hidden xl:inline">Найти</span>
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg font-medium border-2 border-transparent hover:border-black transition-colors">
              <User className="w-6 h-6" />
              <span className="hidden xl:inline font-bold">Войти</span>
            </button>
            <button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black px-4 py-2 rounded-lg font-bold border-2 border-black transition-transform active:scale-95">
              <ShoppingCart className="w-6 h-6" />
              <span>12 400 ₽</span>
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative w-full flex">
            <Input className="rounded-r-none border-2 border-black border-r-0 h-10 focus-visible:ring-0 font-medium" placeholder="Поиск..." />
            <Button className="rounded-l-none border-2 border-black bg-black h-10 px-4"><Search className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {/* Hero Section - Vibrant Duotone */}
        <section className="bg-emerald-400 border-b-2 border-black overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 grid md:grid-cols-2 gap-8 items-center">
            <div className="relative z-10 space-y-6">
              <Badge className="bg-black text-white hover:bg-black uppercase font-bold px-3 py-1 text-xs border-2 border-transparent w-fit">
                Доставка от 60 минут
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] uppercase tracking-tight">
                Свежие цветы<br/>
                <span className="text-white" style={{ WebkitTextStroke: '2px black' }}>Для важного</span><br/>
                События
              </h1>
              <p className="text-lg md:text-xl font-bold max-w-md border-l-4 border-black pl-4">
                Стойкие сорта и бережная сборка — чтобы букет радовал долго.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button className="bg-black text-white hover:bg-blue-600 h-12 md:h-14 px-8 text-lg font-bold rounded-xl border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all">
                  Весь каталог
                </Button>
                <Button variant="outline" className="bg-white text-black hover:bg-slate-100 h-12 md:h-14 px-8 text-lg font-bold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all">
                  Все магазины
                </Button>
              </div>
            </div>
            <div className="relative hidden md:block h-[350px] lg:h-[450px]">
              <div className="absolute inset-0 bg-blue-500 rounded-3xl border-4 border-black transform rotate-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"></div>
              <img src="/__mockup/images/modern-hero-flowers.png" alt="Flowers" className="absolute inset-0 w-full h-full object-cover rounded-3xl border-4 border-black transform -rotate-3 transition-transform hover:rotate-0 duration-500" />
            </div>
          </div>
        </section>

        {/* Categories Carousel */}
        <section className="py-8 md:py-12 border-b-2 border-black bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-black uppercase mb-6 flex items-center justify-between">
              <span>По поводу</span>
              <a href="#" className="text-sm font-bold text-blue-600 hover:underline flex items-center">Все категории <ChevronRight className="w-4 h-4"/></a>
            </h2>
            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 scrollbar-hide">
              {[
                { name: 'День рождения', icon: Cake, count: 120, color: 'bg-pink-300' },
                { name: 'Романтика', icon: Heart, count: 85, color: 'bg-red-400' },
                { name: '8 марта', icon: Flower2, count: 420, color: 'bg-yellow-300' },
                { name: 'Свадьба', icon: Gem, count: 45, color: 'bg-blue-300' },
                { name: 'Соболезнования', icon: Leaf, count: 12, color: 'bg-slate-300' },
                { name: 'Корпоративное', icon: Building2, count: 30, color: 'bg-emerald-300' },
              ].map((cat, i) => (
                <button key={i} className={`flex-shrink-0 flex items-center gap-3 ${cat.color} border-2 border-black rounded-full px-5 py-3 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group`}>
                  <div className="bg-white p-2 rounded-full border-2 border-black group-hover:scale-110 transition-transform"><cat.icon className="w-5 h-5" /></div>
                  <div className="text-left">
                    <div className="font-bold whitespace-nowrap text-[15px]">{cat.name}</div>
                    <div className="text-xs font-semibold opacity-80">{cat.count} товаров</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Products */}
        <section className="py-12 md:py-16 max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-black uppercase mb-8">Популярные товары</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: 'Букет из 25 роз', price: '3 490', oldPrice: '4 200', shop: 'Розовый сад', rating: 4.8, img: '/__mockup/images/modern-product-1.png', tag: 'Хит' },
              { name: 'Пионы нежность', price: '4 200', shop: 'Bloomy', rating: 5.0, img: '/__mockup/images/modern-product-2.png' },
              { name: 'Авторский микс', price: '5 600', shop: 'Тюльпановая feya', rating: 4.9, img: '/__mockup/images/modern-product-1.png', tag: '-15%' },
              { name: 'Гортензии', price: '2 900', shop: 'Flowers Lab', rating: 4.7, img: '/__mockup/images/modern-product-2.png' },
              { name: 'Свадебный букет', price: '8 500', shop: 'Розовый сад', rating: 4.9, img: '/__mockup/images/modern-product-2.png' },
              { name: 'Монобукет хризантем', price: '2 100', shop: 'Bloomy', rating: 4.6, img: '/__mockup/images/modern-product-1.png' },
              { name: 'Орхидеи в коробке', price: '6 300', shop: 'Тюльпановая feya', rating: 5.0, img: '/__mockup/images/modern-product-2.png', tag: 'Новинка' },
              { name: 'Полевой сбор', price: '3 100', shop: 'Flowers Lab', rating: 4.8, img: '/__mockup/images/modern-product-1.png' },
            ].map((p, i) => (
              <Card key={i} className="rounded-2xl border-2 border-black overflow-hidden hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all group bg-white flex flex-col">
                <div className="relative aspect-square border-b-2 border-black overflow-hidden bg-slate-100">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {p.tag && (
                    <Badge className="absolute top-3 left-3 bg-yellow-400 text-black hover:bg-yellow-400 border-2 border-black font-black uppercase text-[10px] px-2.5 py-1">
                      {p.tag}
                    </Badge>
                  )}
                  <button className="absolute top-3 right-3 p-2 bg-white rounded-full border-2 border-black hover:bg-pink-300 transition-colors active:scale-95">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
                <CardContent className="p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="font-black text-xl leading-none">{p.price} ₽</div>
                    <div className="flex items-center text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-black shrink-0">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" /> {p.rating}
                    </div>
                  </div>
                  {p.oldPrice && <div className="text-sm text-slate-500 line-through font-bold mb-1">{p.oldPrice} ₽</div>}
                  <h3 className="font-bold text-[15px] mb-2 line-clamp-2 flex-1">{p.name}</h3>
                  <div className="text-xs text-slate-600 font-bold mb-4 flex items-center gap-1.5 bg-slate-100 w-fit px-2 py-1 rounded-md border border-slate-200">
                    <Building2 className="w-3 h-3" /> {p.shop}
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold border-2 border-black h-11 mt-auto rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] transition-all">
                    В корзину
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Shops */}
        <section className="py-16 bg-pink-300 border-y-2 border-black">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-black uppercase mb-8 flex justify-between items-end">
              <span>Магазины</span>
              <Button variant="link" className="text-black font-black text-base hover:no-underline hidden sm:flex items-center hover:translate-x-1 transition-transform">
                Все магазины <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Розовый сад', city: 'Москва', rating: 4.8, delivery: 'от 300 ₽' },
                { name: 'Bloomy', city: 'Москва', rating: 5.0, delivery: 'Бесплатно' },
                { name: 'Тюльпановая feya', city: 'Москва', rating: 4.9, delivery: 'от 400 ₽' },
                { name: 'Flowers Lab', city: 'Москва', rating: 4.7, delivery: 'от 250 ₽' },
              ].map((shop, i) => (
                <div key={i} className="bg-white border-2 border-black rounded-2xl p-5 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 bg-yellow-300 rounded-xl border-2 border-black flex items-center justify-center font-black text-2xl group-hover:bg-blue-400 group-hover:text-white transition-colors">
                      {shop.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-lg leading-tight">{shop.name}</div>
                      <div className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {shop.city}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-4 border-t-2 border-slate-100">
                    <div className="flex items-center"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1.5" /> {shop.rating}</div>
                    <div className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> {shop.delivery}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 max-w-5xl mx-auto px-4 text-center">
          <div className="bg-yellow-300 border-4 border-black rounded-3xl p-8 md:p-16 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 translate-x-1/4 translate-y-1/4 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 leading-tight">Откройте свой<br/>цветочный магазин</h2>
              <p className="text-lg md:text-xl font-bold mb-8 max-w-2xl mx-auto opacity-90">
                Присоединяйтесь к тысячам партнеров ЦветоМаркет. Начните получать заказы уже сегодня.
              </p>
              <Button className="bg-black text-white hover:bg-pink-500 h-14 md:h-16 px-10 text-xl font-black rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all">
                Начать продавать
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
