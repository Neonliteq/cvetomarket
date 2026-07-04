import React from "react";
import { Cake, Heart, Flower, Gem, Leaf, Building2 } from "lucide-react";

const OCCASIONS = [
  { icon: Cake, label: "День рождения", count: 1240, image: "/__mockup/images/curated-product-1.png" },
  { icon: Heart, label: "Романтика", count: 850, image: "/__mockup/images/category-romance.png" },
  { icon: Flower, label: "8 марта", count: 3200, image: "/__mockup/images/product-peonies.png" },
  { icon: Gem, label: "Свадьба", count: 430, image: "/__mockup/images/category-wedding.png" },
  { icon: Leaf, label: "Соболезнования", count: 120, image: "/__mockup/images/botanical-bouquet-1.png" },
  { icon: Building2, label: "Корпоративное", count: 560, image: "/__mockup/images/curated-product-3.png" },
];

export function EdgeScroller() {
  return (
    <div className="bg-[#fcfcfd] font-sans text-[#1a1721]" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <section className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <h2 className="text-xs tracking-widest uppercase font-bold text-[#8c889a]">По поводу</h2>
        </div>

        {/* Full-bleed edge-to-edge scroller */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="flex gap-6 px-4 sm:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-2 w-max">
            {OCCASIONS.map((occ, idx) => (
              <div
                key={idx}
                className="group relative shrink-0 w-40 sm:w-48 aspect-[3/4] rounded-[999px] overflow-hidden cursor-pointer transition-transform duration-500 hover:-translate-y-2"
              >
                <img
                  src={occ.image}
                  alt={occ.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1721]/90 via-[#1a1721]/10 to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[999px] group-hover:ring-2 group-hover:ring-white/40 transition-all" />

                <div className="absolute top-6 left-0 right-0 flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
                    <occ.icon className="w-4 h-4 stroke-[1.5]" />
                  </div>
                </div>

                <div className="absolute bottom-7 left-0 right-0 flex flex-col items-center text-center px-3">
                  <span className="text-sm font-bold text-white leading-tight">{occ.label}</span>
                  <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mt-1">
                    {occ.count.toLocaleString("ru-RU")}
                  </span>
                </div>
              </div>
            ))}
            <div className="shrink-0 w-4 sm:w-2" />
          </div>
        </div>
      </section>
    </div>
  );
}
