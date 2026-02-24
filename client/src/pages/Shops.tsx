import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShopCard } from "@/components/ShopCard";
import type { Shop, City } from "@shared/schema";

type ShopWithMeta = Shop & { cityName?: string };

export default function Shops() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const { data: shops, isLoading } = useQuery<ShopWithMeta[]>({ queryKey: ["/api/shops/approved"] });
  const { data: cities } = useQuery<City[]>({ queryKey: ["/api/cities"] });

  const filtered = (shops || []).filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCity && s.cityId !== selectedCity) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Цветочные магазины</h1>
        <p className="text-muted-foreground mt-1">
          {isLoading ? "Загружаем..." : `${filtered.length} магазинов`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск магазинов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-shop-search"
          />
        </div>
      </div>

      {cities && cities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge
            variant={selectedCity === null ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedCity(null)}
          >
            Все города
          </Badge>
          {cities.map((c) => (
            <Badge
              key={c.id}
              variant={selectedCity === c.id ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setSelectedCity(selectedCity === c.id ? null : c.id)}
            >
              {c.name}
            </Badge>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : filtered.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => <ShopCard key={s.id} shop={s} />)}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground space-y-2">
          <Search className="w-12 h-12 mx-auto opacity-20" />
          <p className="font-medium">Магазины не найдены</p>
          <p className="text-sm">Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>
  );
}
