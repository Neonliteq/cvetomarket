import { Link } from "wouter";
import { Flower2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16" style={{ background: "hsl(152 28% 22%)" }}>
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "hsl(152 35% 32%)" }}>
              <Flower2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">ЦветоМаркет</span>
          </div>
          <p className="text-sm" style={{ color: "hsl(140 20% 72%)" }}>
            Маркетплейс цветочных магазинов. Доставка букетов по всему городу.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-sm text-white">Покупателям</p>
          <div className="space-y-1.5">
            <Link href="/catalog"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }}>Каталог</p></Link>
            <Link href="/shops"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }}>Магазины</p></Link>
            <Link href="/account"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }}>Мои заказы</p></Link>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-sm text-white">Продавцам</p>
          <div className="space-y-1.5">
            <Link href="/auth?role=shop"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }}>Открыть магазин</p></Link>
            <Link href="/shop-dashboard"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }}>Кабинет продавца</p></Link>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-sm text-white">Информация</p>
          <div className="space-y-1.5">
            <Link href="/delivery-and-payment"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }} data-testid="link-delivery-payment">Доставка и оплата</p></Link>
            <Link href="/terms-of-use"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }} data-testid="link-terms">Условия использования</p></Link>
            <Link href="/privacy-policy"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }} data-testid="link-privacy">Политика конфиденциальности</p></Link>
            <Link href="/legal-info"><p className="text-sm cursor-pointer transition-colors" style={{ color: "hsl(140 20% 72%)" }} data-testid="link-legal">Юридическая информация</p></Link>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid hsl(152 25% 30%)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: "hsl(140 15% 58%)" }}>© 2026 ЦветоМаркет. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
