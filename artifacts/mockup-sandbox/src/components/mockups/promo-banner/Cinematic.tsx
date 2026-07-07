export default function Cinematic() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0e0c11] p-8">
      <div className="w-full max-w-[1200px] rounded-2xl overflow-hidden relative h-[420px] shadow-2xl">
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1490750967868-88df5691b759?w=1400&q=85"
          alt="Цветы"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-14">
          <div className="max-w-xl">
            {/* Top line decoration */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#e879a0]" />
              <span className="text-[11px] tracking-[0.25em] uppercase text-[#e879a0] font-semibold">
                Коллекция 2025
              </span>
            </div>

            <h2 className="text-5xl font-black text-white leading-[1.1] mb-4 drop-shadow-lg">
              Свежие цветы —<br />
              <span className="italic font-light text-white/80">прямо к двери</span>
            </h2>

            <p className="text-white/60 text-[15px] mb-8 leading-relaxed max-w-sm">
              Более 500 композиций от лучших флористов города. Собираем и доставляем за 90 минут.
            </p>

            <div className="flex items-center gap-4">
              <button className="bg-white text-[#1a1721] text-sm font-black px-7 py-3.5 rounded-full hover:bg-white/90 transition-colors shadow-xl">
                Смотреть каталог
              </button>
              <button className="text-white/70 hover:text-white text-sm font-medium transition-colors border border-white/25 hover:border-white/50 px-5 py-3 rounded-full">
                Как это работает
              </button>
            </div>
          </div>
        </div>

        {/* Bottom stats strip */}
        <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm border-t border-white/10 flex divide-x divide-white/10">
          {[
            { n: "500+", label: "букетов" },
            { n: "30+", label: "магазинов" },
            { n: "90 мин", label: "доставка" },
            { n: "4.9 ★", label: "рейтинг" },
          ].map((s) => (
            <div key={s.n} className="flex-1 flex flex-col items-center py-3">
              <span className="text-white font-bold text-lg leading-none">{s.n}</span>
              <span className="text-white/45 text-[11px] mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
