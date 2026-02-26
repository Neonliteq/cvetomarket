import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function FloatingCart() {
  const { itemCount, total } = useCart();
  const [location] = useLocation();
  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 600);
      return () => clearTimeout(timer);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  if (itemCount === 0 || location === "/cart" || location === "/checkout") return null;

  return (
    <Link href="/cart">
      <Button
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 px-5 gap-3 transition-transform",
          bounce && "animate-bounce"
        )}
        data-testid="floating-cart"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          <Badge className="absolute -top-2.5 -right-3 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">
            {itemCount}
          </Badge>
        </div>
        <span className="font-semibold">{total.toLocaleString("ru-RU")} ₽</span>
      </Button>
    </Link>
  );
}
