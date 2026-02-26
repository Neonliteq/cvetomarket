import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  color: string;
  coordinates: number[][];
}

interface DeliveryZonesMapProps {
  zones: DeliveryZone[];
  center?: [number, number];
  onSave: (zones: DeliveryZone[]) => void;
  saving?: boolean;
}

const ZONE_COLORS = [
  "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336",
  "#00BCD4", "#795548", "#607D8B", "#E91E63", "#3F51B5",
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function DeliveryZonesMap({ zones: initialZones, center, onSave, saving }: DeliveryZonesMapProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const ymapInstance = useRef<any>(null);
  const polygonsRef = useRef<Map<string, any>>(new Map());
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones || []);
  const [mapReady, setMapReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZonePrice, setNewZonePrice] = useState("");
  const drawingPolygonRef = useRef<any>(null);
  const zonesRef = useRef(zones);

  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  const loadYmaps = useCallback(() => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) {
      toast({ title: "API-ключ Яндекс Карт не настроен", variant: "destructive" });
      return;
    }

    if ((window as any).ymaps) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.onload = () => {
      (window as any).ymaps.ready(initMap);
    };
    script.onerror = () => {
      toast({ title: "Ошибка загрузки Яндекс Карт", variant: "destructive" });
    };
    document.head.appendChild(script);
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || ymapInstance.current) return;
    const ymaps = (window as any).ymaps;

    const map = new ymaps.Map(mapRef.current, {
      center: center || [55.751574, 37.573856],
      zoom: 11,
      controls: ["zoomControl", "searchControl", "geolocationControl"],
    });

    ymapInstance.current = map;
    setMapReady(true);

    zonesRef.current.forEach((zone) => {
      addPolygonToMap(zone);
    });
  }, [center]);

  useEffect(() => {
    loadYmaps();
    return () => {
      if (ymapInstance.current) {
        ymapInstance.current.destroy();
        ymapInstance.current = null;
      }
    };
  }, [loadYmaps]);

  const addPolygonToMap = (zone: DeliveryZone) => {
    if (!ymapInstance.current) return;
    const ymaps = (window as any).ymaps;

    const polygon = new ymaps.Polygon(
      [zone.coordinates],
      {
        hintContent: zone.name,
        balloonContent: `${zone.name}: ${zone.price} ₽`,
      },
      {
        fillColor: zone.color + "40",
        strokeColor: zone.color,
        strokeWidth: 3,
        editorDrawingCursor: "crosshair",
      }
    );

    polygon.editor.startEditing();
    polygon.editor.stopEditing();

    polygon.events.add("click", () => {
      polygon.editor.startEditing();
    });

    polygon.events.add("editorstatechange", () => {
      const coords = polygon.geometry.getCoordinates()[0];
      if (coords) {
        setZones((prev) =>
          prev.map((z) => (z.id === zone.id ? { ...z, coordinates: coords } : z))
        );
      }
    });

    ymapInstance.current.geoObjects.add(polygon);
    polygonsRef.current.set(zone.id, polygon);
  };

  const startDrawing = () => {
    if (!newZoneName.trim()) {
      toast({ title: "Введите название зоны", variant: "destructive" });
      return;
    }
    if (!newZonePrice || Number(newZonePrice) < 0) {
      toast({ title: "Введите стоимость доставки", variant: "destructive" });
      return;
    }

    if (!ymapInstance.current) return;
    const ymaps = (window as any).ymaps;

    const colorIdx = zones.length % ZONE_COLORS.length;
    const color = ZONE_COLORS[colorIdx];

    const polygon = new ymaps.Polygon(
      [],
      { hintContent: newZoneName },
      {
        fillColor: color + "40",
        strokeColor: color,
        strokeWidth: 3,
        editorDrawingCursor: "crosshair",
        editorMaxPoints: 50,
      }
    );

    ymapInstance.current.geoObjects.add(polygon);
    polygon.editor.startDrawing();
    drawingPolygonRef.current = { polygon, color };
    setDrawing(true);
  };

  const finishDrawing = () => {
    if (!drawingPolygonRef.current) return;
    const { polygon, color } = drawingPolygonRef.current;

    polygon.editor.stopDrawing();
    polygon.editor.stopEditing();

    const coords = polygon.geometry.getCoordinates()[0];
    if (!coords || coords.length < 3) {
      ymapInstance.current.geoObjects.remove(polygon);
      toast({ title: "Зона должна содержать минимум 3 точки", variant: "destructive" });
      setDrawing(false);
      drawingPolygonRef.current = null;
      return;
    }

    const newZone: DeliveryZone = {
      id: generateId(),
      name: newZoneName.trim(),
      price: Number(newZonePrice),
      color,
      coordinates: coords,
    };

    ymapInstance.current.geoObjects.remove(polygon);
    drawingPolygonRef.current = null;

    addPolygonToMap(newZone);
    setZones((prev) => [...prev, newZone]);
    setNewZoneName("");
    setNewZonePrice("");
    setDrawing(false);
  };

  const cancelDrawing = () => {
    if (drawingPolygonRef.current) {
      const { polygon } = drawingPolygonRef.current;
      polygon.editor.stopDrawing();
      ymapInstance.current.geoObjects.remove(polygon);
      drawingPolygonRef.current = null;
    }
    setDrawing(false);
  };

  const removeZone = (id: string) => {
    const polygon = polygonsRef.current.get(id);
    if (polygon && ymapInstance.current) {
      ymapInstance.current.geoObjects.remove(polygon);
      polygonsRef.current.delete(id);
    }
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  const handleSave = () => {
    const updatedZones = zones.map((zone) => {
      const polygon = polygonsRef.current.get(zone.id);
      if (polygon) {
        const coords = polygon.geometry.getCoordinates()[0];
        if (coords) return { ...zone, coordinates: coords };
      }
      return zone;
    });
    onSave(updatedZones);
  };

  return (
    <div className="space-y-4">
      <div
        ref={mapRef}
        className="w-full h-[400px] rounded-lg border overflow-hidden bg-muted"
        data-testid="delivery-zones-map"
      />

      {mapReady && (
        <>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Добавить зону доставки</p>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Название зоны (напр. Центр)"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="flex-1 min-w-[150px]"
                  disabled={drawing}
                  data-testid="input-zone-name"
                />
                <Input
                  type="number"
                  placeholder="Цена (₽)"
                  value={newZonePrice}
                  onChange={(e) => setNewZonePrice(e.target.value)}
                  className="w-28"
                  min={0}
                  disabled={drawing}
                  data-testid="input-zone-price"
                />
                {!drawing ? (
                  <Button
                    onClick={startDrawing}
                    className="gap-1.5"
                    data-testid="button-start-drawing"
                  >
                    <Plus className="w-4 h-4" /> Нарисовать
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={finishDrawing} data-testid="button-finish-drawing">
                      Готово
                    </Button>
                    <Button variant="outline" onClick={cancelDrawing} data-testid="button-cancel-drawing">
                      Отмена
                    </Button>
                  </div>
                )}
              </div>
              {drawing && (
                <p className="text-xs text-muted-foreground">
                  Кликайте по карте, чтобы задать границы зоны. Нажмите «Готово» после завершения.
                </p>
              )}
            </CardContent>
          </Card>

          {zones.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Зоны доставки ({zones.length})</p>
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  data-testid={`zone-item-${zone.id}`}
                >
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{zone.name}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {zone.price === 0 ? "Бесплатно" : `${zone.price.toLocaleString("ru-RU")} ₽`}
                  </Badge>
                  <Input
                    type="number"
                    className="w-24"
                    value={zone.price}
                    min={0}
                    onChange={(e) => {
                      const price = Number(e.target.value);
                      setZones((prev) =>
                        prev.map((z) => (z.id === zone.id ? { ...z, price } : z))
                      );
                    }}
                    data-testid={`input-zone-price-${zone.id}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive shrink-0"
                    onClick={() => removeZone(zone.id)}
                    data-testid={`button-remove-zone-${zone.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-zones"
          >
            {saving ? "Сохраняем..." : "Сохранить зоны доставки"}
          </Button>
        </>
      )}

      {!mapReady && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 mr-2 animate-pulse" />
          Загрузка карты...
        </div>
      )}
    </div>
  );
}
