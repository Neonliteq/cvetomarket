export default function SplitContrast() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0eff5] p-8">
      <div className="w-full max-w-[1200px] rounded-2xl overflow-hidden flex h-[420px] shadow-2xl">
        {/* Left — dark editorial */}
        <div className="w-[48%] bg-[#1a1721] flex flex-col justify-between p-10 relative overflow-hidden shrink-0">
          {/* Decorative circle */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#4a1c40]/40" />
          <div className="absolute -bottom-16 -right-10 w-48 h-48 rounded-full bg-[#4a1c40]/25" />

          <div className="relative z-10">
            <span className="text-[11px] tracking-[0.22em] uppercase font-semibold text-[#c084a0] mb-4 block">
              Специальное предложение
            </span>
            <h2 className="text-4xl font-bold text-white leading-[1.15] mb-3">
              Цветы, которые<br />
              <span className="text-[#e879a0]">говорят</span> за вас
            </h2>
            <p className="text-[15px] text-white/55 leading-relaxed max-w-xs">
              Бесплатная доставка на первый заказ от 2 000 ₽ — только эту неделю
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <button className="bg-[#e879a0] hover:bg-[#d4608a] text-white text-sm font-bold px-6 py-3 rounded-full transition-colors shadow-lg">
              Выбрать букет →
            </button>
            <span className="text-white/35 text-xs">Доставка за 1–3 часа</span>
          </div>
        </div>

        {/* Right — photo */}
        <div className="flex-1 relative">
          <img
            src="https://images.unsplash.com/photo-1487530811015-780d6d1e45c3?w=900&q=85"
            alt="Букет цветов"
            className="w-full h-full object-cover"
          />
          {/* Badge */}
          <div className="absolute top-6 right-6 bg-white/95 backdrop-blur rounded-xl px-4 py-2.5 shadow-lg">
            <p className="text-[11px] text-gray-400 font-medium">Скидка</p>
            <p className="text-2xl font-black text-[#1a1721] leading-none">−20%</p>
          </div>
          {/* Gradient edge blend */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#1a1721] to-transparent" />
        </div>
      </div>
    </div>
  );
}
