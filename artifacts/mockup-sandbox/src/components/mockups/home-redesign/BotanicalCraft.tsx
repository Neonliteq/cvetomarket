import React from 'react';
import { 
  Search, MapPin, Bell, ShoppingCart, User, Menu, 
  Truck, ShieldCheck, Clock, Cake, Heart, Flower, 
  Gem, Leaf, Building2, Star, ArrowRight
} from 'lucide-react';

export default function BotanicalCraft() {
  return (
    <div className="min-h-screen font-sans bg-[#f7f5f0] text-[#2c3b2e]" style={{ fontFamily: "'Lora', serif" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Nunito:wght@300;400;500;600&display=swap');
        .font-serif-custom { font-family: 'Lora', serif; }
        .font-sans-custom { font-family: 'Nunito', sans-serif; }
        .bg-sage { background-color: #8f9e8b; }
        .text-sage { color: #8f9e8b; }
        .bg-terracotta { background-color: #c3806b; }
        .text-terracotta { color: #c3806b; }
        .bg-clay { background-color: #e8e4d9; }
        .border-sage { border-color: #8f9e8b; }
      `}} />

      {/* Header - Two Rows */}
      <header className="bg-white border-b border-[#e8e4d9] sticky top-0 z-50 shadow-sm font-sans-custom">
        {/* Row 1: Logo + Search */}
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2 text-2xl font-serif-custom font-semibold text-[#2c3b2e]">
            <Flower className="w-8 h-8 text-sage" />
            <span>ЦветоМаркет</span>
          </div>
          <div className="hidden md:flex flex-1 max-w-2xl relative">
            <input 
              type="text" 
              placeholder="Поиск букетов, магазинов, цветов..." 
              className="w-full bg-[#f7f5f0] border border-[#e8e4d9] rounded-full py-2.5 pl-5 pr-12 text-[#2c3b2e] focus:outline-none focus:border-sage transition-colors"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-sage hover:text-[#2c3b2e] transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-[#2c3b2e]">
            <button className="p-2 hover:bg-[#f7f5f0] rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-terracotta rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-[#f7f5f0] rounded-full transition-colors relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-sage text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">3</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 cursor-pointer hover:text-sage transition-colors">
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Войти</span>
            </div>
            <button className="md:hidden p-2 hover:bg-[#f7f5f0] rounded-full">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Row 2: Nav, City, Controls */}
        <div className="border-t border-[#e8e4d9] bg-[#faf9f6]">
          <div className="container mx-auto px-6 flex items-center justify-between h-12 text-sm font-medium text-[#4a5d4e]">
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-1.5 hover:text-sage transition-colors">
                <MapPin className="w-4 h-4" />
                <span>Москва</span>
              </button>
              <nav className="hidden md:flex items-center gap-6">
                <a href="#" className="hover:text-sage transition-colors">Главная</a>
                <a href="#" className="hover:text-sage transition-colors">Каталог</a>
                <a href="#" className="hover:text-sage transition-colors">Магазины</a>
              </nav>
            </div>
            
            {/* Trust Strip Docked in Header */}
            <div className="hidden lg:flex items-center gap-6 text-xs text-[#6a7a6d]">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-terracotta" />
                <span>Доставим за 1–3 часа</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sage" />
                <span>Гарантия свежести</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#d4b572]" />
                <span>Удобное время доставки</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-12 pb-20 px-6 overflow-hidden">
          {/* Background decorative blob */}
          <div className="absolute top-0 right-0 w-2/3 h-full bg-[#e8e4d9] rounded-bl-[100px] -z-10 opacity-60"></div>
          
          <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-sage rounded-full text-sage text-sm font-sans-custom font-semibold mb-6 shadow-sm">
                <Truck className="w-4 h-4" />
                Доставка от 60 минут
              </div>
              <h1 className="text-5xl md:text-6xl font-serif-custom font-medium leading-[1.1] mb-6 text-[#2c3b2e]">
                Свежие цветы <br/>
                <span className="text-sage italic">для важного события</span> <br/>
                и без повода
              </h1>
              <p className="text-lg text-[#4a5d4e] font-sans-custom mb-8 leading-relaxed">
                Стойкие сорта и бережная сборка — чтобы букет радовал долго. Заказывайте напрямую из проверенных мастерских вашего города.
              </p>

              {/* Hero Search */}
              <div className="bg-white p-2 rounded-2xl shadow-lg border border-[#e8e4d9] flex items-center gap-2 mb-8 font-sans-custom">
                <div className="flex-1 pl-4 flex items-center gap-3">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Розы, пионы, свадебный букет..." 
                    className="w-full py-3 bg-transparent border-none focus:outline-none text-[#2c3b2e]"
                  />
                </div>
                <button className="bg-sage hover:bg-[#7a8a76] text-white px-8 py-3 rounded-xl font-medium transition-colors">
                  Найти
                </button>
              </div>

              <div className="flex items-center gap-4 font-sans-custom">
                <button className="px-6 py-2.5 bg-[#2c3b2e] text-white rounded-full font-medium hover:bg-[#1a231b] transition-colors">
                  Весь каталог
                </button>
                <button className="px-6 py-2.5 bg-white border border-[#2c3b2e] text-[#2c3b2e] rounded-full font-medium hover:bg-[#f7f5f0] transition-colors">
                  Все магазины
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl relative z-10">
                <img 
                  src="/__mockup/images/botanical-hero.png" 
                  alt="Artisanal florist" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-terracotta rounded-full -z-0 opacity-20"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-sage rounded-full -z-0 opacity-20"></div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-white border-y border-[#e8e4d9]">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-serif-custom text-center mb-12">По поводу</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 font-sans-custom">
              {[
                { icon: Cake, label: "День рождения", count: "1 240", color: "bg-[#f5e6e6]", text: "text-[#c3806b]" },
                { icon: Heart, label: "Романтика", count: "856", color: "bg-[#fdf0f3]", text: "text-[#d47285]" },
                { icon: Flower, label: "8 марта", count: "3 420", color: "bg-[#eef2eb]", text: "text-[#8f9e8b]" },
                { icon: Gem, label: "Свадьба", count: "412", color: "bg-[#f2f4f8]", text: "text-[#7a8b9e]" },
                { icon: Leaf, label: "Соболезнования", count: "128", color: "bg-[#f0f0f0]", text: "text-[#666666]" },
                { icon: Building2, label: "Корпоративное", count: "345", color: "bg-[#eef2f5]", text: "text-[#6b8299]" }
              ].map((category, i) => (
                <div key={i} className="flex flex-col items-center group cursor-pointer">
                  <div className={`w-24 h-24 ${category.color} rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-white`}>
                    <category.icon className={`w-10 h-10 ${category.text}`} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-[#2c3b2e] text-center">{category.label}</h3>
                  <span className="text-xs text-gray-500 mt-1">{category.count} товаров</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Products */}
        <section className="py-20 px-6 container mx-auto">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-3xl font-serif-custom">Популярные товары</h2>
            <a href="#" className="hidden sm:flex items-center gap-1 text-sage font-sans-custom font-medium hover:underline">
              Смотреть все <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 font-sans-custom">
            {[
              { name: "Букет из 25 роз", shop: "Розовый сад", price: "4 500 ₽", rating: 4.8 },
              { name: "Пионы нежность", shop: "Bloomy", price: "5 200 ₽", rating: 4.9 },
              { name: "Весенний микс", shop: "Тюльпановая feya", price: "3 100 ₽", rating: 4.7 },
              { name: "Авторский букет №5", shop: "Botanica", price: "6 800 ₽", rating: 5.0 },
              { name: "Гортензия в крафте", shop: "Цветочный дом", price: "2 900 ₽", rating: 4.6 },
              { name: "Ромашки полевые", shop: "Летний луг", price: "1 800 ₽", rating: 4.8 },
              { name: "Сборный букет 'Закат'", shop: "Флористика", price: "4 100 ₽", rating: 4.9 },
              { name: "Монобукет из лизиантусов", shop: "Bloomy", price: "3 500 ₽", rating: 4.7 }
            ].map((product, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-4 bg-gray-100 relative shadow-sm">
                  <img 
                    src={i === 1 ? "/__mockup/images/botanical-bouquet-1.png" : `/images/placeholder-bouquet.png`} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=600&auto=format&fit=crop" }}
                  />
                  <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-terracotta hover:bg-white transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-lg text-[#2c3b2e] group-hover:text-sage transition-colors line-clamp-1">{product.name}</h3>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-500">{product.shop}</span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center text-sm text-[#d4b572]">
                    <Star className="w-3 h-3 fill-current mr-1" />
                    {product.rating}
                  </div>
                </div>
                <div className="font-serif-custom font-semibold text-xl text-[#2c3b2e]">
                  {product.price}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shops Section */}
        <section className="py-20 bg-[#e8e4d9]/50 border-t border-[#e8e4d9]">
          <div className="container mx-auto px-6">
            <div className="flex justify-between items-end mb-10">
              <h2 className="text-3xl font-serif-custom">Лучшие мастерские</h2>
              <a href="#" className="hidden sm:flex items-center gap-1 text-sage font-sans-custom font-medium hover:underline">
                Все магазины <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-sans-custom">
              {[
                { name: "Розовый сад", city: "Москва", rating: 4.8, reviews: 124, delivery: "300 ₽", time: "60-90 мин" },
                { name: "Bloomy", city: "Москва", rating: 4.9, reviews: 342, delivery: "Бесплатно", time: "90 мин" },
                { name: "Тюльпановая feya", city: "Москва", rating: 4.7, reviews: 89, delivery: "400 ₽", time: "120 мин" },
                { name: "Botanica", city: "Москва", rating: 5.0, reviews: 56, delivery: "500 ₽", time: "60 мин" }
              ].map((shop, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-transparent hover:border-sage shadow-sm hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      <img 
                        src={i === 0 ? "/__mockup/images/botanical-shop-1.png" : "https://images.unsplash.com/photo-1497250681558-44faec40f4f7?q=80&w=200&auto=format&fit=crop"} 
                        alt={shop.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2c3b2e] text-lg leading-tight">{shop.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Star className="w-3 h-3 text-[#d4b572] fill-current mr-1" />
                        <span className="font-medium text-[#2c3b2e] mr-1">{shop.rating}</span>
                        <span>({shop.reviews})</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-[#4a5d4e]">
                    <div className="flex justify-between items-center py-1 border-t border-dashed border-[#e8e4d9]">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400"/> Город</span>
                      <span className="font-medium">{shop.city}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-dashed border-[#e8e4d9]">
                      <span className="flex items-center gap-1.5"><Truck className="w-3 h-3 text-gray-400"/> Доставка</span>
                      <span className="font-medium">{shop.delivery}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-dashed border-[#e8e4d9]">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-gray-400"/> Время</span>
                      <span className="font-medium">{shop.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#2c3b2e] -z-20"></div>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sage rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10 translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-terracotta rounded-full mix-blend-multiply filter blur-3xl opacity-30 -z-10 -translate-x-1/3 translate-y-1/3"></div>
          
          <div className="container mx-auto max-w-4xl text-center text-white relative z-10">
            <Flower className="w-12 h-12 text-sage mx-auto mb-6 opacity-80" />
            <h2 className="text-4xl md:text-5xl font-serif-custom font-medium mb-6">
              Откройте свой цветочный магазин
            </h2>
            <p className="text-xl font-sans-custom text-white/80 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Присоединяйтесь к нашей платформе. Мы даем инструменты, аудиторию и заботу, чтобы вы могли сосредоточиться на творчестве и цветах.
            </p>
            <button className="bg-terracotta hover:bg-[#a66a56] text-white px-8 py-4 rounded-xl font-sans-custom font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200">
              Начать продавать
            </button>
          </div>
        </section>
      </main>
      
      {/* Footer Minimal Placeholder */}
      <footer className="bg-white border-t border-[#e8e4d9] py-10 font-sans-custom">
        <div className="container mx-auto px-6 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} ЦветоМаркет. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
