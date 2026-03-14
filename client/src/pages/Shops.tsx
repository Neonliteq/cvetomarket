import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, List, Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopCard } from "@/components/ShopCard";
import { ShopsMap } from "@/components/ShopsMap";
import { useCity } from "@/lib/cityContext";
import type { Shop } from "@shared/schema";

type ShopWithMeta = Shop & { cityName?: string };

export default function Shops() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const { selectedCityId, setSelectedCityId, cities } = useCity();

  const { data: shops, isLoading } = useQuery<ShopWithMeta[]>({ queryKey: ["/api/shops/all"] });

  const filtered = (shops || []).filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCityId && s.cityId !== selectedCityId) return false;
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
        <div className="flex rounded-lg border overflow-hidden">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-none gap-1.5"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
            Список
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            className="rounded-none gap-1.5"
            onClick={() => setViewMode("map")}
            data-testid="button-view-map"
          >
            <Map className="w-4 h-4" />
            Карта
          </Button>
        </div>
      </div>

      {cities && cities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge
            variant={selectedCityId === null ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedCityId(null)}
          >
            Все города
          </Badge>
          {cities.map((c) => (
            <Badge
              key={c.id}
              variant={selectedCityId === c.id ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setSelectedCityId(selectedCityId === c.id ? null : c.id)}
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
      ) : viewMode === "list" ? (
        filtered.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((s) => <ShopCard key={s.id} shop={s} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground space-y-2">
            <Search className="w-12 h-12 mx-auto opacity-20" />
            <p className="font-medium">Магазины не найдены</p>
            <p className="text-sm">Попробуйте изменить параметры поиска</p>
          </div>
        )
      ) : (
        <ShopsMap shops={filtered} />
      )}
    </div>
  );
}
