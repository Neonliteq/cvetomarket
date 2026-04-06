import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopLocationMapProps {
  latitude?: string | null;
  longitude?: string | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export function ShopLocationMap({ latitude, longitude, onLocationSelect }: ShopLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const ymapInstance = useRef<any>(null);
  const placemark = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasCoords = latitude && longitude && Number(latitude) !== 0 && Number(longitude) !== 0;

  const placeMarker = useCallback((lat: number, lng: number) => {
    const ymaps = (window as any).ymaps;
    const map = ymapInstance.current;
    if (!ymaps || !map) return;

    if (placemark.current) {
      map.geoObjects.remove(placemark.current);
    }

    const pm = new ymaps.Placemark(
      [lat, lng],
      { iconCaption: "Ваш магазин" },
      { preset: "islands#violetDotIconWithCaption", draggable: true }
    );

    pm.events.add("dragend", () => {
      const coords = pm.geometry.getCoordinates();
      onLocationSelect(coords[0], coords[1]);
    });

    map.geoObjects.add(pm);
    placemark.current = pm;
  }, [onLocationSelect]);

  const initMap = useCallback(() => {
    if (!mapRef.current || ymapInstance.current) return;
    const ymaps = (window as any).ymaps;

    const center = hasCoords
      ? [Number(latitude), Number(longitude)]
      : [55.751574, 37.573856];

    const map = new ymaps.Map(mapRef.current, {
      center,
      zoom: hasCoords ? 15 : 11,
      controls: ["zoomControl", "searchControl", "geolocationControl"],
    });

    ymapInstance.current = map;
    setMapReady(true);

    if (hasCoords) {
      placeMarker(Number(latitude), Number(longitude));
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (ymapInstance.current) {
            ymapInstance.current.setCenter([coords.latitude, coords.longitude], 13);
          }
        },
        () => {}
      );
    }

    map.events.add("click", (e: any) => {
      const coords = e.get("coords");
      placeMarker(coords[0], coords[1]);
      onLocationSelect(coords[0], coords[1]);
    });

    const searchControl = map.controls.get("searchControl");
    if (searchControl) {
      searchControl.events.add("resultselect", () => {
        const result = searchControl.getResultsArray();
        if (result && result.length > 0) {
          const selected = searchControl.getSelectedIndex();
          const geoObject = result[selected];
          if (geoObject) {
            const coords = geoObject.geometry.getCoordinates();
            placeMarker(coords[0], coords[1]);
            onLocationSelect(coords[0], coords[1]);
          }
        }
      });
    }
  }, [hasCoords, latitude, longitude, placeMarker, onLocationSelect]);

  const loadYmaps = useCallback(() => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) return;

    if ((window as any).ymaps) {
      (window as any).ymaps.ready(initMap);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.onload = () => {
      (window as any).ymaps.ready(initMap);
    };
    document.head.appendChild(script);
  }, [initMap]);

  useEffect(() => {
    if (expanded) {
      loadYmaps();
    }
    return () => {
      if (ymapInstance.current) {
        ymapInstance.current.destroy();
        ymapInstance.current = null;
        placemark.current = null;
        setMapReady(false);
      }
    };
  }, [expanded, loadYmaps]);

  if (!expanded) {
    return (
      <div className="space-y-2">
        {hasCoords && (
          <p className="text-xs text-muted-foreground">
            Координаты: {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 w-full"
          onClick={() => setExpanded(true)}
          data-testid="button-open-location-map"
        >
          <MapPin className="w-4 h-4" />
          {hasCoords ? "Изменить точку на карте" : "Указать точку на карте"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-[300px] rounded-lg border overflow-hidden bg-muted"
        data-testid="shop-location-map"
      />
      {!mapReady && (
        <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 mr-2 animate-pulse" /> Загрузка карты...
        </div>
      )}
      {mapReady && (
        <p className="text-xs text-muted-foreground">
          Кликните по карте или перетащите метку, чтобы указать местоположение магазина. Также можете воспользоваться поиском.
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(false)}
        data-testid="button-close-location-map"
      >
        Свернуть карту
      </Button>
    </div>
  );
}
