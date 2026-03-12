import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Search, SlidersHorizontal, X, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ProductCard } from "@/components/ProductCard";
import type { Product, Category, City } from "@shared/schema";

type ProductWithMeta = Product & { shopName?: string; categoryName?: string; cityName?: string; tags?: string[] };

export default function Catalog() {
  const searchStr = useSearch();
  const [search, setSearch] = useState(() => new URLSearchParams(searchStr).get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(searchStr).get("q") || "";
    setSearch(q);
  }, [searchStr]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [sortBy, setSortBy] = useState("popular");
  const [inStockOnly, setInStockOnly] = useState(false);

  const { data: products, isLoading } = useQuery<ProductWithMeta[]>({ queryKey: ["/api/products"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: cities } = useQuery<City[]>({ queryKey: ["/api/cities"] });

  const searchLower = search.toLowerCase();

  const filtered = (products || []).filter((p) => {
    if (!p.isActive) return false;
    if (inStockOnly && !p.inStock) return false;
    if (search) {
      const inName = p.name.toLowerCase().includes(searchLower);
      const inComposition = p.composition ? p.composition.toLowerCase().includes(searchLower) : false;
      const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(searchLower));
      const inDescription = p.description ? p.description.toLowerCase().includes(searchLower) : false;
      if (!inName && !inComposition && !inTags && !inDescription) return false;
    }
    if (selectedTag && !(p.tags || []).includes(selectedTag)) return false;
    if (selectedCategory && p.categoryId !== selectedCategory) return false;
    if (selectedType && (p as any).type !== selectedType) return false;
    const price = Number(p.price);
    if (price < priceRange[0] || price > priceRange[1]) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
    if (sortBy === "rating") return Number(b.rating) - Number(a.rating);
    return Number(b.reviewCount) - Number(a.reviewCount);
  });

  const allTags = Array.from(
    new Set((products || []).flatMap((p) => p.tags || []))
  ).sort();

  const typeLabels: Record<string, string> = { bouquet: "Букеты", gift: "Подарки", tasty_gift: "Вкусные подарки", addon: "Доп. товары" };
  const activeFilters = [
    ...(selectedType ? [typeLabels[selectedType] || selectedType] : []),
    ...(selectedCategory && categories ? [categories.find((c) => c.id === selectedCategory)?.name] : []),
    ...(selectedTag ? [`#${selectedTag}`] : []),
    ...(inStockOnly ? ["В наличии"] : []),
    ...(search ? [`Поиск: ${search}`] : []),
  ].filter(Boolean) as string[];

  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="font-semibold">Тип товара</Label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedType === null ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedType(null)}
            data-testid="filter-type-all"
          >
            Все
          </Badge>
          <Badge
            variant={selectedType === "bouquet" ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedType(selectedType === "bouquet" ? null : "bouquet")}
            data-testid="filter-type-bouquet"
          >
            Букеты
          </Badge>
          <Badge
            variant={selectedType === "gift" ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedType(selectedType === "gift" ? null : "gift")}
            data-testid="filter-type-gift"
          >
            Подарки
          </Badge>
          <Badge
            variant={selectedType === "tasty_gift" ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedType(selectedType === "tasty_gift" ? null : "tasty_gift")}
            data-testid="filter-type-tasty-gift"
          >
            Вкусные подарки
          </Badge>
          <Badge
            variant={selectedType === "addon" ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedType(selectedType === "addon" ? null : "addon")}
            data-testid="filter-type-addon"
          >
            Доп. товары
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Категория</Label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Все
          </Badge>
          {categories?.map((c) => (
            <Badge
              key={c.id}
              variant={selectedCategory === c.id ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
            >
              {c.name}
            </Badge>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="space-y-2">
          <Label className="font-semibold flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> По цветам и тегам
          </Label>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                data-testid={`filter-tag-${tag}`}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="font-semibold">Цена: {priceRange[0].toLocaleString("ru")} — {priceRange[1].toLocaleString("ru")} ₽</Label>
        <Slider
          min={0}
          max={50000}
          step={500}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Наличие</Label>
        <Badge
          variant={inStockOnly ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={() => setInStockOnly((v) => !v)}
        >
          Только в наличии
        </Badge>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedCategory(null);
          setSelectedCity(null);
          setSelectedType(null);
          setSelectedTag(null);
          setPriceRange([0, 50000]);
          setInStockOnly(false);
          setSearch("");
        }}
      >
        Сбросить фильтры
      </Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Каталог букетов</h1>
        <p className="text-muted-foreground mt-1">
          {isLoading ? "Загружаем..." : `${sorted.length} ${sorted.length === 1 ? "товар" : "товаров"}`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-20">
            <h3 className="font-semibold mb-4">Фильтры</h3>
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, цветам, составу..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44" data-testid="select-sort">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">По популярности</SelectItem>
                <SelectItem value="rating">По рейтингу</SelectItem>
                <SelectItem value="price_asc">Цена: по возрастанию</SelectItem>
                <SelectItem value="price_desc">Цена: по убыванию</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="default" className="lg:hidden gap-2" data-testid="button-filters">
                  <SlidersHorizontal className="w-4 h-4" />
                  Фильтры
                  {activeFilters.length > 0 && (
                    <Badge variant="default" className="ml-1">{activeFilters.length}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Фильтры</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <Badge key={f} variant="secondary" className="gap-1">
                  {f}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => {
                    if (f.startsWith("Поиск:")) setSearch("");
                    else if (f === "В наличии") setInStockOnly(false);
                    else if (f.startsWith("#")) setSelectedTag(null);
                    else if (selectedType && typeLabels[selectedType] === f) setSelectedType(null);
                    else setSelectedCategory(null);
                  }} />
                </Badge>
              ))}
            </div>
          )}

          {!isLoading && allTags.length > 0 && !selectedTag && !search && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
              <span className="text-xs text-muted-foreground self-center">Популярные теги:</span>
              {allTags.slice(0, 12).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer text-xs capitalize hover:bg-primary/10 transition-colors"
                  onClick={() => setSelectedTag(tag)}
                  data-testid={`tag-chip-${tag}`}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
            </div>
          ) : sorted.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {sorted.map((p) => <ProductCard key={p.id} product={p} shopId={p.shopId} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground space-y-2">
              <Search className="w-12 h-12 mx-auto opacity-20" />
              <p className="font-medium">Ничего не найдено</p>
              <p className="text-sm">Попробуйте изменить параметры поиска</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
