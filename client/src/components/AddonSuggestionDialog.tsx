import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Plus, Minus, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart";
import type { Product } from "@shared/schema";

interface AddonSuggestionDialogProps {
  shopId: string | null;
  onClose: () => void;
}

export function AddonSuggestionDialog({ shopId, onClose }: AddonSuggestionDialogProps) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: [`/api/shops/${shopId}/products`],
    enabled: !!shopId,
  });

  const addons = (products || []).filter(
    (p) => (p as any).type === "addon" && p.inStock && p.isActive
  );

  useEffect(() => {
    if (!isLoading && products && addons.length === 0 && shopId) {
      onClose();
    }
  }, [isLoading, products, addons.length, shopId]);

  const open = !!shopId && (isLoading || addons.length > 0);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!quantities[id]) setQuantities((q) => ({ ...q, [id]: 1 }));
      }
      return next;
    });
  };

  const changeQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(1, (prev[id] || 1) + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleAdd = () => {
    selected.forEach((productId) => {
      const product = addons.find((p) => p.id === productId);
      if (!product || !shopId) return;
      const qty = quantities[productId] || 1;
      for (let i = 0; i < qty; i++) {
        addItem(product, shopId);
      }
    });
    handleClose();
  };

  const handleClose = () => {
    setSelected(new Set());
    setQuantities({});
    onClose();
  };

  const totalExtra = [...selected].reduce((sum, id) => {
    const p = addons.find((a) => a.id === id);
    return sum + (p ? Number(p.price) * (quantities[id] || 1) : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <DialogTitle>Дополните ваш заказ</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Популярные дополнения к букету от этого магазина
          </p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {addons.map((addon) => {
            const isSelected = selected.has(addon.id);
            const qty = quantities[addon.id] || 1;
            const price = Number(addon.price);
            const image = addon.images?.[0];

            return (
              <div
                key={addon.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
                onClick={() => toggleSelect(addon.id)}
                data-testid={`addon-item-${addon.id}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(addon.id)}
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`checkbox-addon-${addon.id}`}
                />
                {image ? (
                  <img
                    src={image}
                    alt={addon.name}
                    className="w-14 h-14 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded bg-muted flex items-center justify-center shrink-0">
                    <Gift className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{addon.name}</p>
                  {addon.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{addon.description}</p>
                  )}
                  <p className="font-bold text-primary mt-0.5">
                    {price.toLocaleString("ru-RU")} ₽
                  </p>
                </div>
                {isSelected && (
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-6 h-6"
                      onClick={() => changeQty(addon.id, -1)}
                      data-testid={`button-addon-minus-${addon.id}`}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-5 text-center text-sm font-medium">{qty}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-6 h-6"
                      onClick={() => changeQty(addon.id, 1)}
                      data-testid={`button-addon-plus-${addon.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t space-y-3">
          {selected.size > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Доп. товаров: <Badge variant="secondary">{selected.size}</Badge>
              </span>
              <span className="font-bold text-primary">
                +{totalExtra.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              data-testid="button-addon-skip"
            >
              Пропустить
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={handleAdd}
              disabled={selected.size === 0}
              data-testid="button-addon-add"
            >
              <ShoppingBag className="w-4 h-4" />
              Добавить {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
