import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Product, Shop } from "@shared/schema";

export interface CartItem {
  product: Product & { shopName?: string };
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  shopId: string | null;
  addItem: (product: Product & { shopName?: string }, shopId: string) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setItems(parsed.items || []);
        setShopId(parsed.shopId || null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify({ items, shopId }));
  }, [items, shopId]);

  const addItem = (product: Product & { shopName?: string }, newShopId: string): boolean => {
    if (shopId && shopId !== newShopId && items.length > 0) return false;
    setShopId(newShopId);
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    return true;
  };

  const removeItem = (productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      if (next.length === 0) setShopId(null);
      return next;
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => {
    setItems([]);
    setShopId(null);
  };

  const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, shopId, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
