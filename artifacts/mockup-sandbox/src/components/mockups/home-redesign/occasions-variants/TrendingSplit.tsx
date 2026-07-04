import React from "react";
import { Cake, Heart, Flower, Gem, Leaf, Building2, TrendingUp, ArrowRight } from "lucide-react";

const TRENDING = {
  icon: Flower,
  label: "8 марта",
  count: 3200,
  image: "/__mockup/images/product-peonies.png",
  tag: "Пик сезона",
};

const LIST = [
  { icon: Heart, label: "Романтика", count: 850 },
  { icon: Cake, label: "День рождения", count: 1240 },
  { icon: Gem, label: "Свадьба", count: 430 },
  { icon: Building2, label: "Корпоративное", count: 560 },
  { icon: Leaf, label: "Соболезнования", count: 120 },
];

const MAX_COUNT = Math.max(...LIST.map((l) => l.count));

export function TrendingSplit() {
  return (
    <div className="bg-[#fcfcfd] font-sans text-[#1a1721]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet" />

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xs tracking-widest uppercase font-bold text-[#8c889a] mb-8">По поводу</h2>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Trending hero card */}
            <div className="lg:col-span-3 group relative rounded-2xl overflow-hidden cursor-pointer min-h-[380px]">
              <img
                src={TRENDING.image}
                alt={TRENDING.label}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1721]/90 via-[#1a1721]/25 to-transparent" />

              <div className="absolute top-5 left-5 flex items-center gap-1.5 bg-[#4a1c40] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                {TRENDING.tag}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-7 flex items-end justify-between">
                <div>
                  <h3
                    className="text-4xl text-white mb-2"
                    style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}
                  >
                    {TRENDING.label}
                  </h3>
                  <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                    {TRENDING.count.toLocaleString("ru-RU")} товаров в наличии
                  </span>
                </div>
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-[#1a1721]" />
                </div>
              </div>
            </div>

            {/* Ranked list */}
            <div className="lg:col-span-2 flex flex-col rounded-2xl border border-[#e1dfeb] bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f0eff5]">
                <span className="text-xs font-bold uppercase tracking-wide text-[#8c889a]">Другие поводы</span>
              </div>
              <div className="flex-1 divide-y divide-[#f0eff5]">
                {LIST.map((occ, idx) => (
                  <button
                    key={idx}
                    className="w-full flex items-center gap-4 px-5 py-4 group hover:bg-[#f8f7f9] transition-colors text-left"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#f0eff5] group-hover:bg-[#4a1c40] flex items-center justify-center shrink-0 transition-colors">
                      <occ.icon className="w-4 h-4 text-[#4a4655] group-hover:text-white stroke-[1.5] transition-colors" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[#1a1721]">{occ.label}</span>
                        <span className="text-xs font-medium text-[#a8a4b5]">{occ.count.toLocaleString("ru-RU")}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#f0eff5] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#4a1c40]/70 group-hover:bg-[#4a1c40] transition-colors"
                          style={{ width: `${Math.max(8, (occ.count / MAX_COUNT) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
