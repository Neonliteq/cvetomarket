import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Flower2, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Главная" },
    { href: "/catalog", label: "Каталог" },
    { href: "/shops", label: "Магазины" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Flower2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg hidden sm:block">ЦветоМаркет</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(location === l.href && "bg-accent text-accent-foreground")}
              >
                {l.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative" data-testid="button-cart">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-user-menu">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block max-w-24 truncate">{user.name}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user.role === "buyer" && (
                  <DropdownMenuItem asChild>
                    <Link href="/account">Мои заказы</Link>
                  </DropdownMenuItem>
                )}
                {user.role === "shop" && (
                  <DropdownMenuItem asChild>
                    <Link href="/shop-dashboard">Панель магазина</Link>
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Администрирование</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/chat">Сообщения</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button size="sm" data-testid="button-login">Войти</Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={cn("w-full justify-start", location === l.href && "bg-accent")}
              >
                {l.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
