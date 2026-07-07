export default function SoftEditorial() {
  const tags = ["Розы", "Пионы", "Тюльпаны", "Хризантемы", "Орхидеи"];

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0eff5] p-8">
      <div className="w-full max-w-[1200px] rounded-2xl overflow-hidden flex h-[420px] shadow-xl bg-[#fdfcff] border border-[#e8e4f0]">
        {/* Left — editorial text */}
        <div className="flex-1 flex flex-col justify-center px-12 py-10 relative">
          {/* Large decorative background letter */}
          <span className="absolute -top-4 -left-2 text-[180px] font-black text-[#e8e4f0] leading-none select-none pointer-events-none">
            Ц
          </span>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-[#e879a0]" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-[#b06080] font-semibold">
                Для каждого случая
              </span>
            </div>

            <h2 className="text-[38px] font-black text-[#1a1721] leading-[1.15] mb-3">
              Найдите букет,<br />
              который <span className="text-[#c84070] relative">
                тронет
                <svg className="absolute -bottom-1 left-0 w-full" height="4" viewBox="0 0 100 4" preserveAspectRatio="none">
                  <path d="M0 3 Q25 0 50 3 Q75 6 100 3" stroke="#e879a0" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              </span> сердце
            </h2>

            <p className="text-[14px] text-[#6b5f78] leading-relaxed mb-7 max-w-xs">
              Ручная сборка от флористов, которые любят своё дело. Доставка по городу от 1 часа.
            </p>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2 mb-8">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#f0eaf5] text-[#7c5a8a] border border-[#ddd0ea] hover:bg-[#e879a0] hover:text-white hover:border-transparent cursor-pointer transition-all"
                >
                  {t}
                </span>
              ))}
            </div>

            <button className="bg-[#1a1721] hover:bg-[#2d1a35] text-white text-sm font-bold px-7 py-3 rounded-full transition-colors w-fit">
              В каталог →
            </button>
          </div>
        </div>

        {/* Right — circular photo with decorative frame */}
        <div className="w-[400px] shrink-0 flex items-center justify-center relative bg-[#f5f0fa] overflow-hidden">
          {/* Soft radial bg */}
          <div className="absolute inset-0 bg-gradient-radial from-[#ead5f0] via-[#f0e8f8] to-[#f5f0fa]" style={{ background: "radial-gradient(ellipse at 60% 40%, #ead5f0 0%, #f0e8f8 45%, #f5f0fa 100%)" }} />

          {/* Decorative ring */}
          <div className="absolute w-80 h-80 rounded-full border-[16px] border-white/60 z-10" />

          {/* Photo in circle */}
          <div className="relative z-20 w-72 h-72 rounded-full overflow-hidden shadow-2xl border-4 border-white">
            <img
              src="https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&q=85"
              alt="Букет цветов"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Floating badge */}
          <div className="absolute bottom-12 left-8 z-30 bg-white rounded-2xl px-4 py-3 shadow-lg border border-[#eee]">
            <p className="text-[11px] text-[#aaa] font-medium">Под заказ</p>
            <p className="text-sm font-black text-[#1a1721]">от 1 500 ₽</p>
          </div>
        </div>
      </div>
    </div>
  );
}
