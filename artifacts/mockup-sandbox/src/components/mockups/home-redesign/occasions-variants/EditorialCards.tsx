import React from "react";
import { Cake, Heart, Flower, Gem, Leaf, Building2, ArrowUpRight } from "lucide-react";

const FEATURED = [
  {
    icon: Heart,
    label: "Романтика",
    count: 850,
    image: "/__mockup/images/category-romance.png",
    span: "col-span-1",
  },
  {
    icon: Flower,
    label: "8 марта",
    count: 3200,
    image: "/__mockup/images/product-peonies.png",
    span: "col-span-1",
  },
  {
    icon: Gem,
    label: "Свадьба",
    count: 430,
    image: "/__mockup/images/category-wedding.png",
    span: "col-span-1",
  },
];

const MORE = [
  { icon: Cake, label: "День рождения", count: 1240 },
  { icon: Leaf, label: "Соболезнования", count: 120 },
  { icon: Building2, label: "Корпоративное", count: 560 },
];

export function EditorialCards() {
  return (
    <div className="bg-[#fcfcfd] font-sans text-[#1a1721]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet" />

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-xs tracking-widest uppercase font-bold text-[#8c889a]">По поводу</h2>
            <span className="text-sm font-semibold text-[#4a1c40] cursor-pointer hover:underline">Все поводы</span>
          </div>

          {/* Featured editorial photo cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            {FEATURED.map((occ, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/5]"
              >
                <img
                  src={occ.image}
                  alt={occ.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1721]/85 via-[#1a1721]/15 to-transparent" />

                <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
                  <occ.icon className="w-4 h-4 stroke-[1.5]" />
                </div>

                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-4 h-4" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3
                    className="text-2xl text-white mb-1"
                    style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}
                  >
                    {occ.label}
                  </h3>
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                    {occ.count.toLocaleString("ru-RU")} товаров
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Compact secondary occasions row */}
          <div className="flex flex-wrap gap-3">
            {MORE.map((occ, idx) => (
              <button
                key={idx}
                className="group flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full border border-[#e1dfeb] bg-white hover:border-[#4a1c40] hover:bg-[#4a1c40] transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-[#f0eff5] group-hover:bg-white/15 flex items-center justify-center transition-colors">
                  <occ.icon className="w-3.5 h-3.5 text-[#4a4655] group-hover:text-white stroke-[1.5]" />
                </span>
                <span className="text-sm font-semibold text-[#4a4655] group-hover:text-white transition-colors">
                  {occ.label}
                </span>
                <span className="text-xs font-medium text-[#a8a4b5] group-hover:text-white/60 transition-colors">
                  {occ.count.toLocaleString("ru-RU")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
