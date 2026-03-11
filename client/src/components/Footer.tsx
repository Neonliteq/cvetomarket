import { Link } from "wouter";
import { Flower2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ЦветоМаркет</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Маркетплейс цветочных магазинов. Доставка букетов по всему городу.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-sm">Покупателям</p>
          <div className="space-y-1.5">
            <Link href="/catalog"><p className="text-sm text-muted-foreground cursor-pointer">Каталог</p></Link>
            <Link href="/shops"><p className="text-sm text-muted-foreground cursor-pointer">Магазины</p></Link>
            <Link href="/account"><p className="text-sm text-muted-foreground cursor-pointer">Мои заказы</p></Link>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-sm">Продавцам</p>
          <div className="space-y-1.5">
            <Link href="/auth?role=shop"><p className="text-sm text-muted-foreground cursor-pointer">Открыть магазин</p></Link>
            <Link href="/shop-dashboard"><p className="text-sm text-muted-foreground cursor-pointer">Кабинет продавца</p></Link>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-sm">Информация</p>
          <div className="space-y-1.5">
            <Link href="/delivery-and-payment"><p className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-delivery-payment">Доставка и оплата</p></Link>
            <Link href="/terms-of-use"><p className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-terms">Условия использования</p></Link>
            <p className="text-sm text-muted-foreground">Политика конфиденциальности</p>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">© 2026 ЦветоМаркет. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
